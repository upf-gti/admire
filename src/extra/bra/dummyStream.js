function DummyStream()
{
    this.blackCanvas = undefined;
    this.silenceStream = undefined;
    this.blackStream = undefined;
    this.silenceTrack = undefined
    this.blackTrack = undefined;
    this.createSilenceTrack();
    this.createBlackTrack();
    this.stream = new MediaStream([this.silenceTrack, this.blackTrack]);
}

/**
 * Create a silence audio track.
 */
DummyStream.prototype.createSilenceTrack = function()
{
    let audioContext = new AudioContext();
    let oscillatorNode = audioContext.createOscillator();
    let destination = oscillatorNode.connect(audioContext.createMediaStreamDestination());
    oscillatorNode.start();

    this.silenceStream = destination.stream;
    this.silenceTrack = this.silenceStream.getAudioTracks()[0];
    this.silenceTrack.enabled = false;
}
 
/**
 * Create a black video track.
 * @param {Number} width - The video width.
 * @param {Number} height - The video height.
 */
DummyStream.prototype.createBlackTrack = function( width = 320, height = 240 )
{
    if( !this.blackCanvas )
    {
        this.blackCanvas = window.document.createElement("canvas");
    }

    this.blackCanvas.width = width;
    this.blackCanvas.height = height;
    let context = this.blackCanvas.getContext("2d");
    context.fillRect(0, 0, width, height);

    this.blackStream = this.blackCanvas.captureStream();
    this.blackTrack = this.blackStream.getVideoTracks()[0];
    this.blackTrack.enabled = false;
}

/**
 * Return the audio track.
 * @returns {MediaStreamTrack} The audio track.
 */
DummyStream.prototype.getAudioTrack = function()
{
    return this.silenceTrack;
}

/**
 * Return the video track.
 * @returns {MediaStreamTrack} The video track.
 */
DummyStream.prototype.getVideoTrack = function()
{
    return this.blackTrack;
}

/**
 * Return the stream.
 * @returns {MediaStream} The stream.
 */
DummyStream.prototype.getStream = function()
{
    return this.stream;
}

export { DummyStream };