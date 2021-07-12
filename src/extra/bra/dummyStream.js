export function DummyStream()
{
//#region PRIVATE

    let _blackCanvas = null;
    let _silenceStream = null;
    let _blackStream = null;
    let _silenceTrack = null
    let _blackTrack = null;

    /**
     * Create a silence audio track.
     */
    let createSilenceTrack = function()
    {
        let audioContext = new AudioContext();

        let gainNode = audioContext.createGain();
        let oscillatorNode = audioContext.createOscillator();
        oscillatorNode.connect(gainNode);
        let destination = gainNode.connect(audioContext.createMediaStreamDestination());

        _silenceStream = destination.stream;
        _silenceTrack = _silenceStream.getAudioTracks()[0];
    };

    /**
     * Create a black video track.
     * @param {Number} width - The video width.
     * @param {Number} height - The video height.
     */
    let createBlackTrack = function( width = 320, height = 240 )
    {
        if( !_blackCanvas )
        {
            _blackCanvas = window.document.createElement("canvas");
        }

        _blackCanvas.width = width;
        _blackCanvas.height = height;
        let context = _blackCanvas.getContext("2d");
        context.fillRect(0, 0, width, height);

        _blackStream = _blackCanvas.captureStream();
        _blackTrack = _blackStream.getVideoTracks()[0];
    };

    createSilenceTrack();
    createBlackTrack();
    let _stream = new MediaStream([_silenceTrack, _blackTrack]);

    /**
     * Return the audio track.
     * @returns {MediaStreamTrack} The audio track.
     */
    let getAudioTrack = function()
    {
        return _silenceTrack;
    };

    /**
     * Return the video track.
     * @returns {MediaStreamTrack} The video track.
     */
    let getVideoTrack = function()
    {
        return _blackTrack;
    };

    /**
     * Return the stream.
     * @returns {MediaStream} The stream.
     */
    let getStream = function()
    {
        return _stream;
    };

//#endregion

//#region PUBLIC

    return {
        getAudioTrack,
        getVideoTrack,
        getStream
    };

//#endregion
}