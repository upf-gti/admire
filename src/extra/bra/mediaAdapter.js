export function MediaAdapter( settings )
{
//#region PRIVATE

    let _defaultSettings =
    {
        // Debug messages to console?
        debug: false,

        // Style used to debug messages.
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(13, 89%, 45%, 1)",
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign(_defaultSettings, settings);

    let console = (settings.debug) ? window.console : null;

    let _events = { };
    let _blackCanvas = null;
    let _audioStream = null;
    let _videoStream = null;
    let _mediaStream = null;

    let _audioDevices = { }; // _audioDevices[label] = deviceId
    let _videoDevices = { }; // _videoDevices[label] = deviceId

    let _resolutions =
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

    let _audioConstraints =
    {
        audio:
        {
            deviceId: { exact: undefined }
        }
    };

    let _videoConstraints =
    {
        video:
        {
            deviceId: { exact: undefined },
            width: { exact: undefined },
            height: { exact: undefined },
            frameRate: { ideal: 60 }
        }
    };

    let _streamSettings =
    {
        audio: null, // label
        video: null, // label
        resolution: null, // _resolutions key
    };

    let _previousAudioConstraints = null;
    let _previousVideoConstraints = null;

    /**
     * Add a function that will be called whenever the specified event is emitted.
     * @param {String} event - The event name.
     * @param {Function} listener - The function to add.
     */
    let on = function( event, listener )
    {
        if( typeof _events[event] !== "object" )
        {
            _events[event] = [];
        }

        _events[event].push(listener);
    };

    /**
     * Remove the function previously added to be called whenever the specified event is emitted.
     * @param {String} event - The event name.
     * @param {Function} listener - The previously added function.
     */
    let off = function( event, listener )
    {   
        if( typeof _events[event] === "object" )
        {
            let index = _events[event].indexOf(listener);
            if( index > -1 )
            {
                _events[event].splice(index, 1);
            }
        }
    };

    /**
     * Emit the specified event.
     * @param {String} event - The event name.
     */
    let emit = function( event )
    {
        let args = [].slice.call(arguments, 1);

        if( typeof _events[event] === "object" )
        {
            let listeners = _events[event].slice();
            for( let i = 0; i < listeners.length; i++ )
            {
                listeners[i].apply(this, args);
            }
        }
    };

    /**
     * Start the media adapter.
     */
    let start = function()
    {
        if( !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices )
        {
            console?.log("%c" + "Media Devices Error" + "%o", settings.debugStyle, "Media devices are not available");
            return false;
        }

        // Create a dummy stream.
        _audioStream = getSilenceStream();
        _videoStream = getBlackStream();
        _mediaStream = mixStreams(_audioStream, _videoStream);

        let initialize = async function()
        {
            const catchCallback = error => console?.trace("%c" + "Media Devices Error" + "%o", settings.debugStyle, error);
            
            await window.navigator.mediaDevices.getUserMedia({ audio: true }).catch(catchCallback);
            await window.navigator.mediaDevices.getUserMedia({ video: true }).catch(catchCallback);
            await findDevices().catch(catchCallback);
            await setDefaultDevices().catch(catchCallback);
        };

        initialize();

        return true;
    };

    /**
     * Find the available media input and output devices.
     */
    let findDevices = async function()
    {
        return getDevices().then(gotDevices).catch(errorDevices);
    };

    /**
     * Set the default devices.
     */
    let setDefaultDevices = async function()
    {
        // Try to get the media configuration from the local storage
        // or use the default values.

        let audio = window.localStorage.getItem("audio") || "None";
        if( !(audio in _audioDevices) )
        {
            audio = "None";
            window.localStorage.removeItem("audio");
        }

        let video = window.localStorage.getItem("video") || "None";
        if( !(video in _videoDevices) )
        {
            video = "None";
            window.localStorage.removeItem("video");
        }

        try
        {
            await setAudio(audio);
            try
            {
                await setVideo(video);
            }
            catch( error )
            {
                setVideo("None");
            }
        }
        catch( error )
        {
            await setAudio("None");
            try
            {
                await setVideo(video);
            }
            catch( error )
            {
                setVideo("None");
            }
        }
    };

    /**
     * Request a list of the available media input and output devices.
     */
    let getDevices = function()
    {
        return window.navigator.mediaDevices.enumerateDevices();
    };

    /**
     * Success handler of the get devices function.
     * @param {MediaDeviceInfo[]} deviceInfos - The collection of device infos.
     */
    let gotDevices = function( deviceInfos )
    {
        _audioDevices = { };
        _videoDevices = { };

        // Add inputs for silence and black streams.
        _audioDevices["None"] = "";
        _videoDevices["None"] = "";

        let a = 0, v = 0;
        for( let deviceInfo of deviceInfos )
        {
            if( deviceInfo.kind === "audioinput" )
            {
                let label = (deviceInfo.label === "" ) ? ("Audio input " + a) : deviceInfo.label;
                _audioDevices[label] = deviceInfo.deviceId;
                a++;
            }

            if( deviceInfo.kind === "videoinput" )
            {
                let label = (deviceInfo.label === "" ) ? ("Video input " + v) : deviceInfo.label;
                _videoDevices[label] = deviceInfo.deviceId;
                v++;
            }
        }

        console?.log("%c" + "Device Infos" + "%o", settings.debugStyle, JSON.stringify(deviceInfos));
        console?.log("%c" + "got_devices" + "%o%o%o", settings.debugStyle, JSON.stringify(_audioDevices), JSON.stringify(_videoDevices), JSON.stringify(_streamSettings));
        console?.log("%c" + "got_resolutions" + "%o%o", settings.debugStyle, JSON.stringify(_resolutions), JSON.stringify(_streamSettings));

        emit("got_devices", { audioDevices: _audioDevices, videoDevices: _videoDevices, settings: _streamSettings });
        emit("got_resolutions", { resolutions: _resolutions, settings: _streamSettings });
    };

    /**
     * Error handler of the get devices function.
     * @param {Error} error - The catched error.
     */
    let errorDevices = function( error )
    {
        let description = "Device request not allowed in the browser context.";

        console?.log("%c" + "error_devices" + "%o%o", settings.debugStyle, error, description);

        emit("error_devices", { error: error, description: description });
    };

    /**
     * Set the audio device.
     * @param {String} device - The audio device.
     */
    let setAudio = function( device )
    {
        // Check whether the device exists.
        if( !(device in _audioDevices) )
        {
            return Promise.reject(new Error("Device " + device + " doesn't exist"));
        }

        // Check whether the device is not already selected.
        if( device === _streamSettings.audio )
        {
            return Promise.reject(new Error("Device " + device + " already selected"));
        }

        if( device === "None" )
        {
            // Update settings.
            _streamSettings.audio = device;

            // Save settings.
            window.localStorage.setItem("audio", _streamSettings.audio);

            // Get dummy stream.
            _audioStream = getSilenceStream();
            _mediaStream = mixStreams(_audioStream, _videoStream);

            console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, _mediaStream, JSON.stringify(_streamSettings));

            emit("got_stream", { stream: _mediaStream, settings: _streamSettings });

            return Promise.resolve(_mediaStream);
        }
        else
        {
            // Save previous audio constraints.
            _previousAudioConstraints = clone(_audioConstraints);

            // Update audio device constraints.
            let deviceId = _audioDevices[device];
            _audioConstraints.audio.deviceId.exact = deviceId;

            return getAudioStream();
        }
    };

    /**
     * Set the video device and resolution.
     * @param {String} device - The video device.
     * @param {String} resolution - The video resolution.
     */
    let setVideo = function( device, resolution = "Undefined" )
    {
        // Check whether the device exists.
        if( !(device in _videoDevices) )
        {
            return Promise.reject(new Error("Device " + device + " doesn't exist"));;
        }

        // Check whether the resolution exists.
        if( !(resolution in _resolutions) )
        {
            return Promise.reject(new Error("Resolution " + resolution + " doesn't exist"));
        }

        // Check whether the device and resolution is not already selected.
        if( device === _streamSettings.video && resolution === _streamSettings.resolution )
        {
            return Promise.reject(new Error("Device " + device + " and resolution " + resolution + " already selected"));
        }

        if( device === "None" )
        {
            // Update settings.
            _streamSettings.video = device;
            _streamSettings.resolution = resolution;

            // Save settings.
            window.localStorage.setItem("video", _streamSettings.video);

            // Get dummy stream.
            let width = _resolutions[resolution].width;
            let height = _resolutions[resolution].height;
            _videoStream = getBlackStream(width, height);
            _mediaStream = mixStreams(_audioStream, _videoStream);

            console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, _mediaStream, JSON.stringify(_streamSettings));

            emit("got_stream", { stream: _mediaStream, settings: _streamSettings });

            return Promise.resolve(_mediaStream);
        }
        else
        {
            // Save previous video constraints.
            _previousVideoConstraints = clone(_videoConstraints);

            // Update video device constraints.
            let deviceId = _videoDevices[device];
            _videoConstraints.video.deviceId.exact = deviceId;

            // Update video resolution constraints.
            let width = _resolutions[resolution].width;
            let height = _resolutions[resolution].height;
            _videoConstraints.video.width.exact = width;
            _videoConstraints.video.height.exact = height;

            return getVideoStream();
        }
    };

    /**
     * Return a silence audio track.
     * @return {MediaStreamTrack} The silence audio track.
     */
    let getSilenceTrack = function()
    {
        let audioContext = new AudioContext();

        let gainNode = audioContext.createGain();
        let oscillatorNode = audioContext.createOscillator();
        oscillatorNode.connect(gainNode);
        let destination = gainNode.connect(audioContext.createMediaStreamDestination());

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        oscillatorNode.start();

        let stream = destination.stream;
        let audioTrack = stream.getAudioTracks()[0];

        return audioTrack;
    };

    /**
     * Return a black video track.
     * @param {Number} width - The video track width.
     * @param {Number} height - The video track height.
     * @return {MediaStreamTrack} The black video track.
     */
    let getBlackTrack = function( width = 320, height = 240 )
    {
        if( !_blackCanvas )
        {
            _blackCanvas = window.document.createElement("canvas");
        }

        _blackCanvas.width = width;
        _blackCanvas.height = height;
        let context = _blackCanvas.getContext("2d");
        context.fillRect(0, 0, width, height);

        let stream = _blackCanvas.captureStream();
        let videoTrack = stream.getVideoTracks()[0];

        return videoTrack;
    };

    /**
     * Return a silenced audio stream.
     */
    let getSilenceStream = function()
    {
        return new MediaStream([getSilenceTrack()]);
    };

    /**
     * Return a black video stream.
     * @param {Number} width - The video stream width.
     * @param {Number} height - The video stream height.
     */
    let getBlackStream = function( width = 320, height = 240 )
    {
        return new MediaStream([getBlackTrack(width, height)]);
    };

    /**
     * Request an audio stream.
     */
    let getAudioStream = function()
    {
        console?.log("%c" + "Get Audio Stream" + "%o", settings.debugStyle, JSON.stringify(_audioConstraints));

        _mediaStream = null;
        stopStream(_audioStream);

        return window.navigator.mediaDevices.getUserMedia(_audioConstraints).then(gotAudioStream).catch(function( error )
        {
            errorAudioStream(error);
            throw error;
        });
    };

    /**
     * Request a video stream.
     */
    let getVideoStream = function()
    {
        console?.log("%c" + "Get Video Stream" + "%o", settings.debugStyle, JSON.stringify(_videoConstraints));

        _mediaStream = null;
        stopStream(_videoStream);

        return window.navigator.mediaDevices.getUserMedia(_videoConstraints).then(gotVideoStream).catch(function( error )
        {
            errorVideoStream(error);
            throw error;
        });
    };

    /**
     * Success handler of the get audio stream function.
     * @param {MediaStream} stream - The audio stream.
     */
    let gotAudioStream = async function( stream )
    {
        // Audio track.
        let audioTrack = stream.getAudioTracks()[0];
        let audioTrackSettings = audioTrack.getSettings();
        console?.log("%c" + "Audio Track" + "%o%o", settings.debugStyle, JSON.stringify(audioTrack.label), JSON.stringify(audioTrackSettings));

        // Check whether the label is listed, enumerateDevices returns an empty label if the permission for accessing the mediadevice is not given.
        if( !(audioTrack.label in _audioDevices) )
        {
            await findDevices();
        }

        // Update settings.
        _streamSettings.audio = audioTrack.label;

        // Save settings.
        window.localStorage.setItem("audio", _streamSettings.audio);

        _audioStream = stream;
        _mediaStream = mixStreams(_audioStream, _videoStream);

        console?.log("%c" + "Audio Constraints" + "%o", settings.debugStyle, JSON.stringify(_audioConstraints));
        console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, _mediaStream, JSON.stringify(_streamSettings));

        emit("got_stream", { stream: _mediaStream, settings: _streamSettings });
    };

    /**
     * Success handler of the get video stream function.
     * @param {MediaStream} stream - The video stream.
     */
    let gotVideoStream = async function( stream )
    {
        // Video track.
        let videoTrack = stream.getVideoTracks()[0];
        let videoTrackSettings = videoTrack.getSettings();
        console?.log("%c" + "Video Track" + "%o%o", settings.debugStyle, JSON.stringify(videoTrack.label), JSON.stringify(videoTrackSettings));

        // Check whether the label is listed, enumerateDevices returns an empty label if the permission for accessing the mediadevice is not given.
        if( !(videoTrack.label in _videoDevices) )
        {
            await findDevices();
        }

        // Check whether the resolution is already listed.
        let width = videoTrackSettings.width;
        let height = videoTrackSettings.height;
        let resolution = width + "x" + height;
        if( !_resolutions[resolution] )
        {
            // Add the resolution.
            _resolutions[resolution] = { width: width, height: height };

            // Sort resolutions.
            _resolutions = Object.entries(_resolutions).sort((a, b) => (a[1].width || Number.NEGATIVE_INFINITY) > (b[1].width || Number.NEGATIVE_INFINITY)).reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

            emit("got_resolutions", { resolutions: _resolutions, settings: _streamSettings });
        }

        // Update video constraints.
        _videoConstraints.video.width.exact = width;
        _videoConstraints.video.height.exact = height;

        // Update settings.
        _streamSettings.video = videoTrack.label;
        _streamSettings.resolution = resolution;

        // Save settings.
        window.localStorage.setItem("video", _streamSettings.video);

        _videoStream = stream;
        _mediaStream = mixStreams(_audioStream, _videoStream);

        console?.log("%c" + "Video Constraints" + "%o", settings.debugStyle, JSON.stringify(_videoConstraints));
        console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, _mediaStream, JSON.stringify(_streamSettings));

        emit("got_stream", { stream: _mediaStream, settings: _streamSettings });
    };

    /**
     * Return a semantic error string from the specified error.
     * @param {Error} error - The catched error.
     */
    let errorStream = function( error )
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
    };

    /**
     * Error handler of the get audio stream function.
     * @param {Error} error - The catched error.
     */
    let errorAudioStream = function( error )
    {
        let description = errorStream(error);

        console?.log("%c" + "Error Constraints" + "%o", settings.debugStyle, JSON.stringify(_audioConstraints));
        console?.log("%c" + "error_stream" + "%o%o%o", settings.debugStyle, error.name, description, JSON.stringify(_streamSettings));

        emit("error_stream", { error: error.name, description: description, settings: _streamSettings });

        if( _previousAudioConstraints )
        {
            _audioConstraints = clone(_previousAudioConstraints);
            _previousAudioConstraints = null;
            getAudioStream();
        }
    };

    /**
     * Error handler of the get video stream function.
     * @param {Error} error - The catched error.
     */
    let errorVideoStream = function( error )
    {
        let description = errorStream(error);

        console?.log("%c" + "Error Constraints" + "%o", settings.debugStyle, JSON.stringify(_videoConstraints));
        console?.log("%c" + "error_stream" + "%o%o%o", settings.debugStyle, error.name, description, JSON.stringify(_streamSettings));

        emit("error_stream", { error: error.name, description: description, settings: _streamSettings });

        if( _previousVideoConstraints )
        {
            _videoConstraints = clone(_previousVideoConstraints);
            _previousVideoConstraints = null;
            getVideoStream();
        }
    };

    /**
     * Mix two streams with 1 audio and 1 video tracks into one.
     * @param {MediaStream} audioStream - The stream with the audio track.
     * @param {MediaStream} videoStream - The stream with the video track.
     * @return {MediaStream} The mixed stream.
     */
    let mixStreams = function( audioStream, videoStream )
    {
        if( !audioStream || !(audioStream instanceof MediaStream) )
        {
            return null;
        }

        if( !videoStream || !(videoStream instanceof MediaStream) )
        {
            return null;
        }

        let audioTracks = audioStream.getAudioTracks();
        if( !audioTracks || audioTracks.length === 0 )
        {
            return null;
        }

        let videoTracks = videoStream.getVideoTracks();
        if( !videoTracks || videoTracks.length === 0 )
        {
            return null;
        }

        let stream = new MediaStream();
        stream.addTrack(audioTracks[0]);
        stream.addTrack(videoTracks[0]);

        return stream;
    };

    /**
     * Stop a stream, stopping its tracks.
     * @param {MediaStream} stream - The stream to stop.
     */
    let stopStream = function( stream )
    {
        if( !stream || !(stream instanceof MediaStream) )
        {
            return;
        }

        stream.getTracks().forEach(track => track.stop());
    };

    /**
     * Return a clone of the object.
     * @param {Object} object - The object to clone.
     * @return {Object} The clone of the object.
     */
    let clone = function( object )
    {
        return JSON.parse(JSON.stringify(object));
    };

//#endregion

//#region PUBLIC

    return {
        on,
        off,
        start,
        findDevices,
        getDevices,
        setAudio,
        setVideo
    };

//#endregion
}