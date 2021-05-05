function MediaAdapter()
{
    // Debug messages to console?
    this.DEBUG = true;
    this.debugStyle = "background: rgba(34, 34, 34); color: rgb(217, 58, 13)";

    this.events = { };
    this.blackCanvas = undefined;
    this.audioStream = undefined;
    this.videoStream = undefined;
    this.mediaStream = undefined;

    this.audioDevices = { }; // audioDevices[label] = deviceId
    this.videoDevices = { }; // videoDevices[label] = deviceId

    this.resolutions =
    {
        "Undefined":    { width: undefined,	height: undefined },
        "320x240":      { width: 320,	height: 240 },	// QVGA 4:3
        "640x360":      { width: 640,	height: 360 },	// nHD 16:9
        "640x480":      { width: 640,	height: 480 },	// VGA 4:3
        "1280x720":     { width: 1280,	height: 720 },	// HD 16:9
        "1920x1080":    { width: 1920,	height: 1080 },	// FullHD 16:9
        "3840x2160":    { width: 3840,	height: 2160 },	// 4k 16:9
        "7680x4320":    { width: 7680,	height: 4320 }	// 8k 16:9
    };

    this.audioConstraints =
    {
        audio:
        {
            deviceId: { exact: undefined }
        }
    };

    this.videoConstraints =
    {
        video:
        {
            deviceId: { exact: undefined },
            width: { exact: undefined },
            height: { exact: undefined },
            frameRate: { ideal: 60 }
        }
    };

    this.settings =
    {
        audio: undefined, // label
        video: undefined, // label
        resolution: undefined, // resolutions key
    };
}

/**
 * Start the media adapter.
 */
MediaAdapter.prototype.start = function()
{
    if( !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices )
    {
        if( this.DEBUG ) console.log("%cMedia Devices Error%o", this.debugStyle, "Media devices are not available");
        return false;
    }

    // Create a dummy stream.
    this.audioStream = this.getSilenceStream();
    this.videoStream = this.getBlackStream();
    this.mediaStream = MediaAdapter.mixStreams(this.audioStream, this.videoStream);

    let initialize = async function()
    {
        
        window.navigator.mediaDevices.getUserMedia({ audio: true })
        .then(window.navigator.mediaDevices.getUserMedia({ video: true }))
        .then(this.findDevices())
        .then(this.setDefaultDevices())
        .catch( e => console.error('initialize error', e));

    }.bind(this);

    initialize();

    return true;
}

/**
 * Add a function that will be called whenever the specified event is emitted.
 * @param {String} event - The event name.
 * @param {Function} listener - The function to add.
 */
MediaAdapter.prototype.on = function( event, listener )
{
    if( typeof this.events[event] !== "object" )
    {
        this.events[event] = [];
    }

    this.events[event].push(listener);
}

/**
 * Remove the function previously added to be called whenever the specified event is emitted.
 * @param {String} event - The event name.
 * @param {Function} listener - The previously added function.
 */
MediaAdapter.prototype.off = function( event, listener )
{   
    if( typeof this.events[event] === "object" )
    {
        let index = this.events[event].indexOf(listener);
        if( index > -1 )
        {
            this.events[event].splice(index, 1);
        }
    }
}

/**
 * Emit the specified event.
 * @param {String} event - The event name.
 */
MediaAdapter.prototype.emit = function( event )
{
    let args = [].slice.call(arguments, 1);

    if( typeof this.events[event] === "object" )
    {
        let listeners = this.events[event].slice();
        for( let i = 0; i < listeners.length; i++ )
        {
            listeners[i].apply(this, args);
        }
    }
}

/**
 * Find the available media input and output devices.
 */
MediaAdapter.prototype.findDevices = async function()
{
    return this.getDevices().then(this.gotDevices.bind(this)).catch(this.errorDevices.bind(this));
}

/**
 * Set the default devices.
 */
MediaAdapter.prototype.setDefaultDevices = async function()
{
    // Try to get the media configuration from the local storage
    // or use the default values.

    let audio = window.localStorage.getItem("audio") || "None";
    if( !(audio in this.audioDevices) )
    {
        audio = "None";
        window.localStorage.removeItem("audio");
    }

    let video = window.localStorage.getItem("video") || "None";
    if( !(video in this.videoDevices) )
    {
        video = "None";
        window.localStorage.removeItem("video");
    }

    try
    {
        await this.setAudio(audio);
        try
        {
            await this.setVideo(video);
        }
        catch( error )
        {
            this.setVideo("None");
        }
    }
    catch( error )
    {
        await this.setAudio("None");
        try
        {
            await this.setVideo(video);
        }
        catch( error )
        {
            this.setVideo("None");
        }
    }
}

/**
 * Request a list of the available media input and output devices.
 */
MediaAdapter.prototype.getDevices = function()
{
    return window.navigator.mediaDevices.enumerateDevices();
}

/**
 * Success handler of the get devices function.
 * @param {MediaDeviceInfo[]} deviceInfos - The collection of device infos.
 */
MediaAdapter.prototype.gotDevices = function( deviceInfos )
{
    this.audioDevices = { };
    this.videoDevices = { };

    // Add inputs for silence and black streams.
    this.audioDevices["None"] = "";
    this.videoDevices["None"] = "";

    let a = 0, v = 0;
    for( let deviceInfo of deviceInfos )
    {
        if( deviceInfo.kind === "audioinput" )
        {
            let label = (deviceInfo.label === "" ) ? ("Audio input " + a) : deviceInfo.label;
            this.audioDevices[label] = deviceInfo.deviceId;
            a++;
        }

        if( deviceInfo.kind === "videoinput" )
        {
            let label = (deviceInfo.label === "" ) ? ("Video input " + v) : deviceInfo.label;
            this.videoDevices[label] = deviceInfo.deviceId;
            v++;
        }
    }

    if( this.DEBUG ) console.log("%cDevice Infos%o", this.debugStyle, JSON.stringify(deviceInfos));
    if( this.DEBUG ) console.log("%cgot_devices%o%o%o", this.debugStyle, JSON.stringify(this.audioDevices), JSON.stringify(this.videoDevices), JSON.stringify(this.settings));
    if( this.DEBUG ) console.log("%cgot_resolutions%o%o", this.debugStyle, JSON.stringify(this.resolutions), JSON.stringify(this.settings));

    this.emit("got_devices", { audioDevices: this.audioDevices, videoDevices: this.videoDevices, settings: this.settings });
    this.emit("got_resolutions", { resolutions: this.resolutions, settings: this.settings });
}

/**
 * Error handler of the get devices function.
 * @param {Error} error - The catched error.
 */
MediaAdapter.prototype.errorDevices = function( error )
{
    let description = "Device request not allowed in the browser context.";

    if( this.DEBUG ) console.log("%cerror_devices%o%o", this.debugStyle, error, description);

    this.emit("error_devices", { error: error, description: description });
}

/**
 * Set the audio device.
 * @param {String} device - The audio device.
 */
MediaAdapter.prototype.setAudio = function( device )
{
    // Check whether the device exists.
    if( !(device in this.audioDevices) )
    {
        return Promise.reject(new Error("Device " + device + " doesn't exist"));
    }

    // Check whether the device is not already selected.
    /*if( device === this.settings.audio )
    {
        return Promise.reject(new Error("Device " + device + " already selected"));
    }*/

    if( device === "None" )
    {
        // Update settings.
        this.settings.audio = device;

        // Save settings.
        window.localStorage.setItem("audio", this.settings.audio);

        // Get dummy stream.
        this.audioStream = this.getSilenceStream();
        this.mediaStream = MediaAdapter.mixStreams(this.audioStream, this.videoStream);

        if( this.DEBUG ) console.log("%cgot_stream%o%o", this.debugStyle, this.mediaStream, JSON.stringify(this.settings));

        this.emit("got_stream", { stream: this.mediaStream, settings: this.settings });

        return Promise.resolve(this.mediaStream);
    }
    else
    {
        // Save previous audio constraints.
        this.previousAudioConstraints = MediaAdapter.clone(this.audioConstraints);

        // Update audio device constraints.
        let deviceId = this.audioDevices[device];
        this.audioConstraints.audio.deviceId.exact = deviceId;

        return this.getAudioStream();
    }
}

/**
 * Set the video device and resolution.
 * @param {String} device - The video device.
 * @param {String} resolution - The video resolution.
 */
MediaAdapter.prototype.setVideo = function( device, resolution = "Undefined" )
{
    // Check whether the device exists.
    if( !(device in this.videoDevices) )
    {
        return Promise.reject(new Error("Device " + device + " doesn't exist"));;
    }

    // Check whether the resolution exists.
    if( !(resolution in this.resolutions) )
    {
        return Promise.reject(new Error("Resolution " + resolution + " doesn't exist"));
    }

    // Check whether the device and resolution is not already selected.
    if( device === this.settings.video && resolution === this.settings.resolution )
    {
        return Promise.reject(new Error("Device " + device + " and resolution " + resolution + " already selected"));
    }

    if( device === "None" )
    {
        // Update settings.
        this.settings.video = device;
        this.settings.resolution = resolution;

        // Save settings.
        window.localStorage.setItem("video", this.settings.video);

        // Get dummy stream.
        let width = this.resolutions[resolution].width;
        let height = this.resolutions[resolution].height;
        this.videoStream = this.getBlackStream(width, height);
        this.mediaStream = MediaAdapter.mixStreams(this.audioStream, this.videoStream);

        if( this.DEBUG ) console.log("%cgot_stream%o%o", this.debugStyle, this.mediaStream, JSON.stringify(this.settings));

        this.emit("got_stream", { stream: this.mediaStream, settings: this.settings });

        return Promise.resolve(this.mediaStream);
    }
    else
    {
        // Save previous video constraints.
        this.previousVideoConstraints = MediaAdapter.clone(this.videoConstraints);

        // Update video device constraints.
        let deviceId = this.videoDevices[device];
        this.videoConstraints.video.deviceId.exact = deviceId;

        // Update video resolution constraints.
        let width = this.resolutions[resolution].width;
        let height = this.resolutions[resolution].height;
        this.videoConstraints.video.width.exact = width;
        this.videoConstraints.video.height.exact = height;

        return this.getVideoStream();
    }
}

/**
 * Return a silence audio track.
 * @return {MediaStreamTrack} The silence audio track.
 */
MediaAdapter.prototype.getSilenceTrack = function()
{
    let audioContext = new AudioContext();
    let oscillatorNode = audioContext.createOscillator();
    let destination = oscillatorNode.connect(audioContext.createMediaStreamDestination());
    oscillatorNode.start();

    let stream = destination.stream;
    let audioTrack = stream.getAudioTracks()[0];
    audioTrack.enabled = false;

    return audioTrack;
}

/**
 * Return a black video track.
 * @param {Number} width - The video track width.
 * @param {Number} height - The video track height.
 * @return {MediaStreamTrack} The black video track.
 */
MediaAdapter.prototype.getBlackTrack = function( width = 320, height = 240 )
{
    if( !this.blackCanvas )
    {
        this.blackCanvas = window.document.createElement("canvas");
    }

    this.blackCanvas.width = width;
    this.blackCanvas.height = height;
    let context = this.blackCanvas.getContext("2d");
    context.fillRect(0, 0, width, height);

    let stream = this.blackCanvas.captureStream();
    let videoTrack = stream.getVideoTracks()[0];
    videoTrack.enabled = false;

    return videoTrack;
}

/**
 * Return a silenced audio stream.
 */
MediaAdapter.prototype.getSilenceStream = function()
{
    return new MediaStream([this.getSilenceTrack()]);
}

/**
 * Return a black video stream.
 * @param {Number} width - The video stream width.
 * @param {Number} height - The video stream height.
 */
MediaAdapter.prototype.getBlackStream = function( width = 320, height = 240 )
{
    return new MediaStream([this.getBlackTrack(width, height)]);
}

/**
 * Request an audio stream.
 */
MediaAdapter.prototype.getAudioStream = function()
{
    if( this.DEBUG ) console.log("%cGet Audio Stream%o", this.debugStyle, JSON.stringify(this.audioConstraints));

    this.mediaStream = undefined;
    MediaAdapter.stopStream(this.audioStream);

    return window.navigator.mediaDevices.getUserMedia(this.audioConstraints).then(this.gotAudioStream.bind(this)).catch(function( error )
    {
        this.errorAudioStream(error);
        throw error;
    }.bind(this));
}

/**
 * Request a video stream.
 */
MediaAdapter.prototype.getVideoStream = function()
{
    if( this.DEBUG ) console.log("%cGet Video Stream%o", this.debugStyle, JSON.stringify(this.videoConstraints));

    this.mediaStream = undefined;
    MediaAdapter.stopStream(this.videoStream);

    return window.navigator.mediaDevices.getUserMedia(this.videoConstraints).then(this.gotVideoStream.bind(this)).catch(function( error )
    {
        this.errorVideoStream(error);
        throw error;
    }.bind(this));
}

/**
 * Success handler of the get audio stream function.
 * @param {MediaStream} stream - The audio stream.
 */
MediaAdapter.prototype.gotAudioStream = async function( stream )
{
    // Audio track.
    let audioTrack = stream.getAudioTracks()[0];
    let audioTrackSettings = audioTrack.getSettings();
    if( this.DEBUG ) console.log("%cAudio Track%o%o", this.debugStyle, JSON.stringify(audioTrack.label), JSON.stringify(audioTrackSettings));

    // Check whether the label is listed, enumerateDevices returns an empty label if the permission for accessing the mediadevice is not given.
    if( !(audioTrack.label in this.audioDevices) )
    {
        await this.findDevices();
    }

    // Update settings.
    this.settings.audio = audioTrack.label;

    // Save settings.
    window.localStorage.setItem("audio", this.settings.audio);

    this.audioStream = stream;
    this.mediaStream = MediaAdapter.mixStreams(this.audioStream, this.videoStream);

    if( this.DEBUG ) console.log("%cAudio Constraints%o", this.debugStyle, JSON.stringify(this.audioConstraints));
    if( this.DEBUG ) console.log("%cgot_stream%o%o", this.debugStyle, this.mediaStream, JSON.stringify(this.settings));

    this.emit("got_stream", { stream: this.mediaStream, settings: this.settings });
}

/**
 * Success handler of the get video stream function.
 * @param {MediaStream} stream - The video stream.
 */
MediaAdapter.prototype.gotVideoStream = async function( stream )
{
    // Video track.
    let videoTrack = stream.getVideoTracks()[0];
    let videoTrackSettings = videoTrack.getSettings();
    if( this.DEBUG ) console.log("%cVideo Track%o%o", this.debugStyle, JSON.stringify(videoTrack.label), JSON.stringify(videoTrackSettings));

    // Check whether the label is listed, enumerateDevices returns an empty label if the permission for accessing the mediadevice is not given.
    if( !(videoTrack.label in this.videoDevices) )
    {
        await this.findDevices();
    }

    // Check whether the resolution is already listed.
    let width = videoTrackSettings.width;
    let height = videoTrackSettings.height;
    let resolution = width + "x" + height;
    if( !this.resolutions[resolution] )
    {
        // Add the resolution.
        this.resolutions[resolution] = { width: width, height: height };

        // Sort resolutions.
        this.resolutions = Object.entries(this.resolutions).sort((a, b) => (a[1].width || Number.NEGATIVE_INFINITY) > (b[1].width || Number.NEGATIVE_INFINITY)).reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        this.emit("got_resolutions", { resolutions: this.resolutions, settings: this.settings });
    }

    // Update video constraints.
    this.videoConstraints.video.width.exact = width;
    this.videoConstraints.video.height.exact = height;

    // Update settings.
    this.settings.video = videoTrack.label;
    this.settings.resolution = resolution;

    // Save settings.
    window.localStorage.setItem("video", this.settings.video);

    this.videoStream = stream;
    this.mediaStream = MediaAdapter.mixStreams(this.audioStream, this.videoStream);

    if( this.DEBUG ) console.log("%cVideo Constraints%o", this.debugStyle, JSON.stringify(this.videoConstraints));
    if( this.DEBUG ) console.log("%cgot_stream%o%o", this.debugStyle, this.mediaStream, JSON.stringify(this.settings));

    this.emit("got_stream", { stream: this.mediaStream, settings: this.settings });
}

/**
 * Return a semantic error string from the specified error.
 * @param {Error} error - The catched error.
 */
MediaAdapter.prototype.errorStream = function( error )
{
    let description = "";
    if( error.name === "NotFoundError" || error.name === "DevicesNotFoundError" )
    {
        description = "Required track is missing.";
    }
    else if( error.name === "NotReadableError" || error.name === "TrackStartError" )
    {
        description = "Microphone or Webcam are already in use.";
    }
    else if( error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError" )
    {
        description = "Constraints cannot be satisfied.";
    }
    else if( error.name === "NotAllowedError" || error.name === "PermissionDeniedError" )
    {
        description = "Permission denied in browser.";
    }
    else if( error.name === "TypeError" || error.name === "TypeError" )
    {
        description = "Empty constraints object.";
    }
    else
    {
        description = "Unknown error.";
    }

    return description + " " + error.message;
}

/**
 * Error handler of the get audio stream function.
 * @param {Error} error - The catched error.
 */
MediaAdapter.prototype.errorAudioStream = function( error )
{
    let description = this.errorStream(error);

    if( this.DEBUG ) console.log("%cError Constraints%o", this.debugStyle, JSON.stringify(this.audioConstraints));
    if( this.DEBUG ) console.log("%cerror_stream%o%o%o", this.debugStyle, error.name, description, JSON.stringify(this.settings));

    this.emit("error_stream", { error: error.name, description: description, settings: this.settings });

    if( this.previousAudioConstraints )
    {
        this.audioConstraints = MediaAdapter.clone(this.previousAudioConstraints);
        this.previousAudioConstraints = undefined;
        this.getAudioStream();
    }
}

/**
 * Error handler of the get video stream function.
 * @param {Error} error - The catched error.
 */
MediaAdapter.prototype.errorVideoStream = function( error )
{
    let description = this.errorStream(error);

    if( this.DEBUG ) console.log("%cError Constraints%o", this.debugStyle, JSON.stringify(this.videoConstraints));
    if( this.DEBUG ) console.log("%cerror_stream%o%o%o", this.debugStyle, error.name, description, JSON.stringify(this.settings));

    this.emit("error_stream", { error: error.name, description: description, settings: this.settings });

    if( this.previousVideoConstraints )
    {
        this.videoConstraints = MediaAdapter.clone(this.previousVideoConstraints);
        this.previousVideoConstraints = undefined;
        this.getVideoStream();
    }
}

/**
 * Mix two streams with 1 audio and 1 video tracks into one.
 * @param {MediaStream} audioStream - The stream with the audio track.
 * @param {MediaStream} videoStream - The stream with the video track.
 * @return {MediaStream} The mixed stream.
 */
MediaAdapter.mixStreams = function( audioStream, videoStream )
{
    if( !audioStream || !(audioStream instanceof MediaStream) )
    {
        return undefined;
    }

    if( !videoStream || !(videoStream instanceof MediaStream) )
    {
        return undefined;
    }

    let audioTracks = audioStream.getAudioTracks();
    if( !audioTracks || audioTracks.length === 0 )
    {
        return undefined;
    }

    let videoTracks = videoStream.getVideoTracks();
    if( !videoTracks || videoTracks.length === 0 )
    {
        return undefined;
    }

    let stream = new MediaStream();
    stream.addTrack(audioTracks[0]);
    stream.addTrack(videoTracks[0]);

    return stream;
}

/**
 * Stop a stream, stopping its tracks.
 * @param {MediaStream} stream - The stream to stop.
 */
MediaAdapter.stopStream = function( stream )
{
    if( !stream || !(stream instanceof MediaStream) )
    {
        return;
    }

    stream.getTracks().forEach(track => track.stop());
}

/**
 * Return a clone of the object.
 * @param {Object} object - The object to clone.
 * @return {Object} The clone of the object.
 */
MediaAdapter.clone = function( object )
{
    return JSON.parse(JSON.stringify(object));
}

export { MediaAdapter };