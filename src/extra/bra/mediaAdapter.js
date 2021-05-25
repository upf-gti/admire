"use strict";

function MediaAdapter( settings )
{
//#region PRIVATE

    var defaults =
    {
        // Debug messages to console?
        debug: false,

        // Style used to debug messages.
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(13, 89%, 45%, 1)",
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign(defaults, settings);

    var console = (settings.debug) ? window.console : undefined;
    var events = { };
    var blackCanvas = undefined;
    var audioStream = undefined;
    var videoStream = undefined;
    var mediaStream = undefined;

    var audioDevices = { }; // audioDevices[label] = deviceId
    var videoDevices = { }; // videoDevices[label] = deviceId

    var resolutions =
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

    var audioConstraints =
    {
        audio:
        {
            deviceId: { exact: undefined }
        }
    };

    var videoConstraints =
    {
        video:
        {
            deviceId: { exact: undefined },
            width: { exact: undefined },
            height: { exact: undefined },
            frameRate: { ideal: 60 }
        }
    };

    var streamSettings =
    {
        audio: undefined, // label
        video: undefined, // label
        resolution: undefined, // resolutions key
    };

    var previousAudioConstraints = undefined;
    var previousVideoConstraints = undefined;

    /**
     * Add a function that will be called whenever the specified event is emitted.
     * @param {String} event - The event name.
     * @param {Function} listener - The function to add.
     */
    var on = function( event, listener )
    {
        if( typeof events[event] !== "object" )
        {
            events[event] = [];
        }

        events[event].push(listener);
    }

    /**
     * Remove the function previously added to be called whenever the specified event is emitted.
     * @param {String} event - The event name.
     * @param {Function} listener - The previously added function.
     */
    var off = function( event, listener )
    {   
        if( typeof events[event] === "object" )
        {
            let index = events[event].indexOf(listener);
            if( index > -1 )
            {
                events[event].splice(index, 1);
            }
        }
    }

    /**
     * Emit the specified event.
     * @param {String} event - The event name.
     */
    var emit = function( event )
    {
        let args = [].slice.call(arguments, 1);

        if( typeof events[event] === "object" )
        {
            let listeners = events[event].slice();
            for( let i = 0; i < listeners.length; i++ )
            {
                listeners[i].apply(this, args);
            }
        }
    }

    /**
     * Start the media adapter.
     */
    var start = function()
    {
        if( !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices )
        {
            console?.log("%c" + "Media Devices Error" + "%o", settings.debugStyle, "Media devices are not available");
            return false;
        }

        // Create a dummy stream.
        audioStream = getSilenceStream();
        videoStream = getBlackStream();
        mediaStream = mixStreams(audioStream, videoStream);

        let initialize = async function()
        {
            await window.navigator.mediaDevices.getUserMedia({ audio: true });
            await window.navigator.mediaDevices.getUserMedia({ video: true });
            await findDevices();
            await setDefaultDevices();
        };

        initialize();

        return true;
    }

    /**
     * Find the available media input and output devices.
     */
    var findDevices = async function()
    {
        return getDevices().then(gotDevices).catch(errorDevices);
    }

    /**
     * Set the default devices.
     */
    var setDefaultDevices = async function()
    {
        // Try to get the media configuration from the local storage
        // or use the default values.

        let audio = window.localStorage.getItem("audio") || "None";
        if( !(audio in audioDevices) )
        {
            audio = "None";
            window.localStorage.removeItem("audio");
        }

        let video = window.localStorage.getItem("video") || "None";
        if( !(video in videoDevices) )
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
    }

    /**
     * Request a list of the available media input and output devices.
     */
    var getDevices = function()
    {
        return window.navigator.mediaDevices.enumerateDevices();
    }

    /**
     * Success handler of the get devices function.
     * @param {MediaDeviceInfo[]} deviceInfos - The collection of device infos.
     */
    var gotDevices = function( deviceInfos )
    {
        audioDevices = { };
        videoDevices = { };

        // Add inputs for silence and black streams.
        audioDevices["None"] = "";
        videoDevices["None"] = "";

        let a = 0, v = 0;
        for( let deviceInfo of deviceInfos )
        {
            if( deviceInfo.kind === "audioinput" )
            {
                let label = (deviceInfo.label === "" ) ? ("Audio input " + a) : deviceInfo.label;
                audioDevices[label] = deviceInfo.deviceId;
                a++;
            }

            if( deviceInfo.kind === "videoinput" )
            {
                let label = (deviceInfo.label === "" ) ? ("Video input " + v) : deviceInfo.label;
                videoDevices[label] = deviceInfo.deviceId;
                v++;
            }
        }

        console?.log("%c" + "Device Infos" + "%o", settings.debugStyle, JSON.stringify(deviceInfos));
        console?.log("%c" + "got_devices" + "%o%o%o", settings.debugStyle, JSON.stringify(audioDevices), JSON.stringify(videoDevices), JSON.stringify(streamSettings));
        console?.log("%c" + "got_resolutions" + "%o%o", settings.debugStyle, JSON.stringify(resolutions), JSON.stringify(streamSettings));

        emit("got_devices", { audioDevices: audioDevices, videoDevices: videoDevices, settings: streamSettings });
        emit("got_resolutions", { resolutions: resolutions, settings: streamSettings });
    }

    /**
     * Error handler of the get devices function.
     * @param {Error} error - The catched error.
     */
    var errorDevices = function( error )
    {
        let description = "Device request not allowed in the browser context.";

        console?.log("%c" + "error_devices" + "%o%o", settings.debugStyle, error, description);

        emit("error_devices", { error: error, description: description });
    }

    /**
     * Set the audio device.
     * @param {String} device - The audio device.
     */
    var setAudio = function( device )
    {
        // Check whether the device exists.
        if( !(device in audioDevices) )
        {
            return Promise.reject(new Error("Device " + device + " doesn't exist"));
        }

        // Check whether the device is not already selected.
        if( device === streamSettings.audio )
        {
            return Promise.reject(new Error("Device " + device + " already selected"));
        }

        if( device === "None" )
        {
            // Update settings.
            streamSettings.audio = device;

            // Save settings.
            window.localStorage.setItem("audio", streamSettings.audio);

            // Get dummy stream.
            audioStream = getSilenceStream();
            mediaStream = mixStreams(audioStream, videoStream);

            console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, mediaStream, JSON.stringify(streamSettings));

            emit("got_stream", { stream: mediaStream, settings: streamSettings });

            return Promise.resolve(mediaStream);
        }
        else
        {
            // Save previous audio constraints.
            previousAudioConstraints = clone(audioConstraints);

            // Update audio device constraints.
            let deviceId = audioDevices[device];
            audioConstraints.audio.deviceId.exact = deviceId;

            return getAudioStream();
        }
    }

    /**
     * Set the video device and resolution.
     * @param {String} device - The video device.
     * @param {String} resolution - The video resolution.
     */
    var setVideo = function( device, resolution = "Undefined" )
    {
        // Check whether the device exists.
        if( !(device in videoDevices) )
        {
            return Promise.reject(new Error("Device " + device + " doesn't exist"));;
        }

        // Check whether the resolution exists.
        if( !(resolution in resolutions) )
        {
            return Promise.reject(new Error("Resolution " + resolution + " doesn't exist"));
        }

        // Check whether the device and resolution is not already selected.
        if( device === streamSettings.video && resolution === streamSettings.resolution )
        {
            return Promise.reject(new Error("Device " + device + " and resolution " + resolution + " already selected"));
        }

        if( device === "None" )
        {
            // Update settings.
            streamSettings.video = device;
            streamSettings.resolution = resolution;

            // Save settings.
            window.localStorage.setItem("video", streamSettings.video);

            // Get dummy stream.
            let width = resolutions[resolution].width;
            let height = resolutions[resolution].height;
            videoStream = getBlackStream(width, height);
            mediaStream = mixStreams(audioStream, videoStream);

            console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, mediaStream, JSON.stringify(streamSettings));

            emit("got_stream", { stream: mediaStream, settings: streamSettings });

            return Promise.resolve(mediaStream);
        }
        else
        {
            // Save previous video constraints.
            previousVideoConstraints = clone(videoConstraints);

            // Update video device constraints.
            let deviceId = videoDevices[device];
            videoConstraints.video.deviceId.exact = deviceId;

            // Update video resolution constraints.
            let width = resolutions[resolution].width;
            let height = resolutions[resolution].height;
            videoConstraints.video.width.exact = width;
            videoConstraints.video.height.exact = height;

            return getVideoStream();
        }
    }

    /**
     * Return a silence audio track.
     * @return {MediaStreamTrack} The silence audio track.
     */
    var getSilenceTrack = function()
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
    var getBlackTrack = function( width = 320, height = 240 )
    {
        if( !blackCanvas )
        {
            blackCanvas = window.document.createElement("canvas");
        }

        blackCanvas.width = width;
        blackCanvas.height = height;
        let context = blackCanvas.getContext("2d");
        context.fillRect(0, 0, width, height);

        let stream = blackCanvas.captureStream();
        let videoTrack = stream.getVideoTracks()[0];
        videoTrack.enabled = false;

        return videoTrack;
    }

    /**
     * Return a silenced audio stream.
     */
    var getSilenceStream = function()
    {
        return new MediaStream([getSilenceTrack()]);
    }

    /**
     * Return a black video stream.
     * @param {Number} width - The video stream width.
     * @param {Number} height - The video stream height.
     */
    var getBlackStream = function( width = 320, height = 240 )
    {
        return new MediaStream([getBlackTrack(width, height)]);
    }

    /**
     * Request an audio stream.
     */
    var getAudioStream = function()
    {
        console?.log("%c" + "Get Audio Stream" + "%o", settings.debugStyle, JSON.stringify(audioConstraints));

        mediaStream = undefined;
        stopStream(audioStream);

        return window.navigator.mediaDevices.getUserMedia(audioConstraints).then(gotAudioStream).catch(function( error )
        {
            errorAudioStream(error);
            throw error;
        });
    }

    /**
     * Request a video stream.
     */
    var getVideoStream = function()
    {
        console?.log("%c" + "Get Video Stream" + "%o", settings.debugStyle, JSON.stringify(videoConstraints));

        mediaStream = undefined;
        stopStream(videoStream);

        return window.navigator.mediaDevices.getUserMedia(videoConstraints).then(gotVideoStream).catch(function( error )
        {
            errorVideoStream(error);
            throw error;
        });
    }

    /**
     * Success handler of the get audio stream function.
     * @param {MediaStream} stream - The audio stream.
     */
    var gotAudioStream = async function( stream )
    {
        // Audio track.
        let audioTrack = stream.getAudioTracks()[0];
        let audioTrackSettings = audioTrack.getSettings();
        console?.log("%c" + "Audio Track" + "%o%o", settings.debugStyle, JSON.stringify(audioTrack.label), JSON.stringify(audioTrackSettings));

        // Check whether the label is listed, enumerateDevices returns an empty label if the permission for accessing the mediadevice is not given.
        if( !(audioTrack.label in audioDevices) )
        {
            await findDevices();
        }

        // Update settings.
        streamSettings.audio = audioTrack.label;

        // Save settings.
        window.localStorage.setItem("audio", streamSettings.audio);

        audioStream = stream;
        mediaStream = mixStreams(audioStream, videoStream);

        console?.log("%c" + "Audio Constraints" + "%o", settings.debugStyle, JSON.stringify(audioConstraints));
        console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, mediaStream, JSON.stringify(streamSettings));

        emit("got_stream", { stream: mediaStream, settings: streamSettings });
    }

    /**
     * Success handler of the get video stream function.
     * @param {MediaStream} stream - The video stream.
     */
    var gotVideoStream = async function( stream )
    {
        // Video track.
        let videoTrack = stream.getVideoTracks()[0];
        let videoTrackSettings = videoTrack.getSettings();
        console?.log("%c" + "Video Track" + "%o%o", settings.debugStyle, JSON.stringify(videoTrack.label), JSON.stringify(videoTrackSettings));

        // Check whether the label is listed, enumerateDevices returns an empty label if the permission for accessing the mediadevice is not given.
        if( !(videoTrack.label in videoDevices) )
        {
            await findDevices();
        }

        // Check whether the resolution is already listed.
        let width = videoTrackSettings.width;
        let height = videoTrackSettings.height;
        let resolution = width + "x" + height;
        if( !resolutions[resolution] )
        {
            // Add the resolution.
            resolutions[resolution] = { width: width, height: height };

            // Sort resolutions.
            resolutions = Object.entries(resolutions).sort((a, b) => (a[1].width || Number.NEGATIVE_INFINITY) > (b[1].width || Number.NEGATIVE_INFINITY)).reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

            emit("got_resolutions", { resolutions: resolutions, settings: streamSettings });
        }

        // Update video constraints.
        videoConstraints.video.width.exact = width;
        videoConstraints.video.height.exact = height;

        // Update settings.
        streamSettings.video = videoTrack.label;
        streamSettings.resolution = resolution;

        // Save settings.
        window.localStorage.setItem("video", streamSettings.video);

        videoStream = stream;
        mediaStream = mixStreams(audioStream, videoStream);

        console?.log("%c" + "Video Constraints" + "%o", settings.debugStyle, JSON.stringify(videoConstraints));
        console?.log("%c" + "got_stream" + "%o%o", settings.debugStyle, mediaStream, JSON.stringify(streamSettings));

        emit("got_stream", { stream: mediaStream, settings: streamSettings });
    }

    /**
     * Return a semantic error string from the specified error.
     * @param {Error} error - The catched error.
     */
    var errorStream = function( error )
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
    var errorAudioStream = function( error )
    {
        let description = errorStream(error);

        console?.log("%c" + "Error Constraints" + "%o", settings.debugStyle, JSON.stringify(audioConstraints));
        console?.log("%c" + "error_stream" + "%o%o%o", settings.debugStyle, error.name, description, JSON.stringify(streamSettings));

        emit("error_stream", { error: error.name, description: description, settings: streamSettings });

        if( previousAudioConstraints )
        {
            audioConstraints = clone(previousAudioConstraints);
            previousAudioConstraints = undefined;
            getAudioStream();
        }
    }

    /**
     * Error handler of the get video stream function.
     * @param {Error} error - The catched error.
     */
    var errorVideoStream = function( error )
    {
        let description = errorStream(error);

        console?.log("%c" + "Error Constraints" + "%o", settings.debugStyle, JSON.stringify(videoConstraints));
        console?.log("%c" + "error_stream" + "%o%o%o", settings.debugStyle, error.name, description, JSON.stringify(streamSettings));

        emit("error_stream", { error: error.name, description: description, settings: streamSettings });

        if( previousVideoConstraints )
        {
            videoConstraints = clone(previousVideoConstraints);
            previousVideoConstraints = undefined;
            getVideoStream();
        }
    }

    /**
     * Mix two streams with 1 audio and 1 video tracks into one.
     * @param {MediaStream} audioStream - The stream with the audio track.
     * @param {MediaStream} videoStream - The stream with the video track.
     * @return {MediaStream} The mixed stream.
     */
    var mixStreams = function( audioStream, videoStream )
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
    var stopStream = function( stream )
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
    var clone = function( object )
    {
        return JSON.parse(JSON.stringify(object));
    }

//#endregion

//#region PUBLIC

    return {
        on: on,
        off: off,
        start: start,
        findDevices: findDevices,
        setAudio: setAudio,
        setVideo: setVideo
    };

//#endregion
}

export { MediaAdapter };