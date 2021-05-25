"use strict"

function DummyStream()
{
//#region PRIVATE

    var blackCanvas = undefined;
    var silenceStream = undefined;
    var blackStream = undefined;
    var silenceTrack = undefined
    var blackTrack = undefined;

    /**
     * Create a silence audio track.
     */
    var createSilenceTrack = function()
    {
        let audioContext = new AudioContext();
        let oscillatorNode = audioContext.createOscillator();
        let destination = oscillatorNode.connect(audioContext.createMediaStreamDestination());
        oscillatorNode.start();

        silenceStream = destination.stream;
        silenceTrack = silenceStream.getAudioTracks()[0];
        silenceTrack.enabled = false;
    }

    /**
     * Create a black video track.
     * @param {Number} width - The video width.
     * @param {Number} height - The video height.
     */
    var createBlackTrack = function( width = 320, height = 240 )
    {
        if( !blackCanvas )
        {
            blackCanvas = window.document.createElement("canvas");
        }

        blackCanvas.width = width;
        blackCanvas.height = height;
        let context = blackCanvas.getContext("2d");
        context.fillRect(0, 0, width, height);

        blackStream = blackCanvas.captureStream();
        blackTrack = blackStream.getVideoTracks()[0];
        blackTrack.enabled = false;
    }

    createSilenceTrack();
    createBlackTrack();
    var stream = new MediaStream([silenceTrack, blackTrack]);

    /**
     * Return the audio track.
     * @returns {MediaStreamTrack} The audio track.
     */
    var getAudioTrack = function()
    {
        return silenceTrack;
    }

    /**
     * Return the video track.
     * @returns {MediaStreamTrack} The video track.
     */
    var getVideoTrack = function()
    {
        return blackTrack;
    }

    /**
     * Return the stream.
     * @returns {MediaStream} The stream.
     */
    var getStream = function()
    {
        return stream;
    }

//#endregion

//#region PUBLIC

    return {
        getAudioTrack: getAudioTrack,
        getVideoTrack: getVideoTrack,
        getStream: getStream
    };

//#endregion
}

export { DummyStream };