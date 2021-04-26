function RtcClient()
{
    // Debug messages to console?
    this.DEBUG = true;
    this.debugStyle = "background: rgb(34, 34, 34); color: rgb(186, 218, 85)";

    // Period to send pings to the server.
    this.PING_PERIOD = 5 * 1000;

    this.userId = undefined;
    this.iceServers = undefined;

    this.ws = undefined;
    this.keepAliveTimer = undefined;
    this.events = { };

    this.peers = { };
    this.localStreams = { };

    /**
     * Handlers used to listen messages from the server.
     *      function - The message is valid, emitted and handled.
     *      true - The message is valid, emitted and not handled.
     *      false - The message is valid, not emitted and not handled.
     *      undefined - The message is not valid.
     */
    this.messages =
    {
        "register_response": this.onRegisterResponse.bind(this),
        "unregister_response": this.onUnregisterResponse.bind(this),
        "call_response": this.onCallResponse.bind(this),
        "incoming_call": this.onIncomingCall.bind(this),
        "accept_call_response": false,
        "cancel_call_response": false,
        "start_call": this.onStartCall.bind(this),
        "offer_response": false,
        "remote_offer": this.onRemoteOffer.bind(this),
        "answer_response": false,
        "remote_answer": this.onRemoteAnswer.bind(this),
        "candidate_response": false,
        "remote_candidate": this.onRemoteCandidate.bind(this),
        "call_canceled": this.onCallCanceled.bind(this),
        "hangup_response": true,
        "user_hangup": this.onUserHangup.bind(this)
    };
}

function Peer()
{
    this.callId = undefined;
    this.callerId = undefined;
    this.calleeId = undefined;
    this.callerStream = undefined;
    this.calleeStream = undefined;
    this.connection = undefined;
}

/**
 * Connect to the server.
 * @param {String} url - The URL of the server.
 */
RtcClient.prototype.connect = function( url )
{
    this.openWebSocket(url);
}

/**
 * Disconnect from the server.
 */
RtcClient.prototype.disconnect = function()
{
    this.closeWebSocket();
}

/**
 * Open the web socket connection.
 * @param {String} url - The URL of the server.
 */
RtcClient.prototype.openWebSocket = function( url )
{
    this.ws = new WebSocket(url);

    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onclose = this.onClose.bind(this);
}

/**
 * Close the web socket connection.
 */
RtcClient.prototype.closeWebSocket = function()
{
    if( this.ws )
    {
        this.ws.close();
    }
}

/**
 * Close a call, closing the peer connection.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.closeCall = function( callId )
{
    // Free resources.

    if( !(callId in this.peers) )
    {
        return;
    }

    let peer = this.peers[callId];
    delete(this.peers[callId]);
    if( peer.connection )
    {
        peer.connection.close();
    }

    let id = (peer.callerId === this.userId) ? peer.callerStream : peer.calleeStream;
    if( id in this.localStreams )
    {
        delete this.localStreams[id];
    }
}

/**
 * Event handler called when the connection is opened.
 * @param {EventListener} event - The dispatched event.
 */
RtcClient.prototype.onOpen = function( event )
{
    // Start the keep alive routine.
    this.keepAlive();

    this.emit("client_connected");
}

/**
 * Event handler called when a message is received from the server.
 * @param {EventListener} msg - The message received.
 */
RtcClient.prototype.onMessage = function( msg )
{
    let message = JSON.parse(msg.data);

    // Check the message.
    if( message.id in this.messages )
    {
        if( this.messages[message.id] === false )
        {
            return;
        }

        if( this.DEBUG ) console.log("%c%s" + "%o", this.debugStyle, message.id, msg.data);

        if( this.messages[message.id] instanceof Function )
        {
            this.messages[message.id](message);
        }

        this.emit(message.id, message);
    }
    else
    {
        if( this.DEBUG ) console.log("%cunknown_message" + "%o", this.debugStyle, msg.data);
    }
}

/**
 * Send a message to the server.
 * @param {Object} message - The message to send.
 */
RtcClient.prototype.sendMessage = function( message )
{
    let msg = JSON.stringify(message);
    if( this.DEBUG && message.id !== "ping" ) console.log("%c%s" + "%o", this.debugStyle, message.id, msg);
    this.ws.send(msg);
}

/**
 * Event handler called when the connection is closed.
 * @param {EventListener} event - The dispatched event.
 */
RtcClient.prototype.onClose = function( event )
{
    this.userId = undefined;
    this.iceServers = undefined;

    // Stop the keep alive routine.
    window.clearTimeout(this.keepAliveTimer);

    this.emit("client_disconnected");
}

/**
 * Add a function that will be called whenever the specified event is emitted.
 * @param {String} event - The event name.
 * @param {Function} listener - The function to add.
 */
RtcClient.prototype.on = function( event, listener )
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
RtcClient.prototype.off = function( event, listener )
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
RtcClient.prototype.emit = function( event )
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
 * Start a keep alive routine.
 */
RtcClient.prototype.keepAlive = function()
{
    if( !this.ws )
    {
        return;
    }

    if( this.ws.readyState !== 1 )
    {
        return;
    }

    this.ping();

    this.keepAliveTimer = window.setTimeout(this.keepAlive.bind(this), this.PING_PERIOD);
}

/**
 * Send a ping to the server.
 */
RtcClient.prototype.ping = function()
{
    // Time in seconds since January 1, 1970 UTC.
    let timestamp = Math.floor(Date.now() / 1000).toString();

    let message = { id: "ping", timestamp: timestamp };
    this.sendMessage(message);
}

/**
 * Register to the server.
 * @param {String} userId - The user id.
 */
RtcClient.prototype.register = function( userId )
{
    if( !userId || !RtcClient.validateString(userId) || this.userId )
    {
        return false;
    }

    let message = { id: "register", userId: userId };
    this.sendMessage(message);

    return true;
}

/**
 * Unregister from the server.
 */
RtcClient.prototype.unregister = function()
{
    if( !this.userId )
    {
        return;
    }

    let message = { id: "unregister", userId: this.userId };
    this.sendMessage(message);
}

/**
 * Call a user with the specified stream.
 * @param {String} calleeId - The callee id.
 * @param {MediaStream} localStream - The local stream to share.
 */
RtcClient.prototype.call = function( calleeId, localStream )
{
    if( !calleeId || !RtcClient.validateString(calleeId) || this.userId === calleeId )
    {
        return false;
    }

    if( !localStream || !(localStream instanceof MediaStream) )
    {
        return false;
    }

    let id = this.generateStreamId();
    this.localStreams[id] = localStream;

    let message = { id: "call", callerId: this.userId, calleeId: calleeId, callerStream: id };
    this.sendMessage(message);

    return true;
}

/**
 * Accept a call with the specified stream.
 * @param {String} callId - The call id.
 * @param {MediaStream} localStream - The local stream to share.
 */
RtcClient.prototype.acceptCall = function( callId, localStream )
{
    if( !(callId in this.peers) )
    {
        return;
    }

    if( !localStream || !(localStream instanceof MediaStream) )
    {
        return false;
    }

    let id = this.generateStreamId();
    this.localStreams[id] = localStream;

    // Update the peer.
    let peer = this.peers[callId];
    peer.calleeStream = id;

    let message = { id: "accept_call", callId: peer.callId, callerId: peer.callerId, calleeId: peer.calleeId, callerStream: peer.callerStream, calleeStream: peer.calleeStream };
    this.sendMessage(message);
}

/**
 * Cancel a call.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.cancelCall = function( callId )
{
    if( !(callId in this.peers) )
    {
        return;
    }

    // Delete the peer.
    let peer = this.peers[callId];
    delete this.peers[callId];

    let message = { id: "cancel_call", callId: peer.callId, callerId: peer.callerId, calleeId: peer.calleeId, callerStream: peer.callerStream };
    this.sendMessage(message);
}

/**
 * Hangup a call.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.hangup = function( callId )
{
    if( !(callId in this.peers) )
    {
        return;
    }

    this.closeCall(callId);

    this.emit("call_state", { callId: callId, state: "closed" });

    let message = { id: "hangup", callId: callId };
    this.sendMessage(message);
}

/**
 * Register response event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onRegisterResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.userId = event.userId;
        this.iceServers = JSON.parse(event.iceServers);
    }
}

/**
 * Unregister response event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onUnregisterResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.userId = undefined;
        this.iceServers = undefined;

        // TODO: Close all the calls.
    }
}

/**
 * Call response event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onCallResponse = function( event )
{
    if( event.status === "ok" )
    {
        // Create the peer.
        let peer = new Peer();
        peer.callId = event.callId;
        peer.callerId = event.callerId;
        peer.calleeId = event.calleeId;
        peer.callerStream = event.callerStream;
        this.peers[peer.callId] = peer;
    }

    if( event.status === "error" )
    {
        if( event.callerStream in this.localStreams )
        {
            delete this.localStreams[event.callerStream];
        }
    }
}

/**
 * Incoming call event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onIncomingCall = function( event )
{
    // Create the peer.
    let peer = new Peer();
    peer.callId = event.callId;
    peer.callerId = event.callerId;
    peer.calleeId = event.calleeId;
    peer.callerStream = event.callerStream;
    this.peers[event.callId] = peer;
}

/**
 * Start call event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onStartCall = function( event )
{
    let self = this;

    // Create the peer connection.
    let configuration = { "iceServers": this.iceServers };
    let peerConnection = new RTCPeerConnection(configuration);

    // Update the peer.
    let peer = this.peers[event.callId];
    peer.calleeStream = event.calleeStream;
    peer.connection = peerConnection;

    // Track the peer connection state.
    peer.connection.oniceconnectionstatechange = function( other )
    {
        self.onConnectionStateChange(peer);
    }

    // Generate ICE candidates.
    peer.connection.onicecandidate = function( other )
    {
        if( !other || !other.candidate )
        {
            return;
        }

        let message = { id: "candidate", callId: event.callId, callerId: event.callerId, calleeId: event.calleeId, candidate: JSON.stringify(other.candidate) };
        self.sendMessage(message);
    };

    peer.connection.onnegotiationneeded = function( other )
    {
        // Generate SDP offer.
        peer.connection.createOffer().then(function( sdp )
        {
            // Set caller local description.
            peer.connection.setLocalDescription(sdp);

            let message = event;
            message["id"] = "offer";
            message["offer"] = JSON.stringify(sdp);
            self.sendMessage(message);
        });
    };

    // Add the stream. This action triggers the ICE negotiation process.
    peer.connection.addStream(this.localStreams[event.callerStream]);
}

/**
 * Remote offer event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onRemoteOffer = function( event )
{
    let self = this;

    // Create the peer connection.
    let configuration = { "iceServers": this.iceServers };
    let peerConnection = new RTCPeerConnection(configuration);

    // Update the peer.
    let peer = this.peers[event.callId];
    peer.connection = peerConnection;

    // Track the peer connection state.
    peer.connection.oniceconnectionstatechange = function( other )
    {
        self.onConnectionStateChange(peer);
    }

    // Set callee remote description.
    peer.connection.setRemoteDescription(JSON.parse(event.offer));

    // Generate ICE candidates.
    peer.connection.onicecandidate = function( other )
    {
        if( !other || !other.candidate )
        {
            return;
        }

        let message = { id: "candidate", callId: event.callId, callerId: event.callerId, calleeId: event.calleeId, candidate: JSON.stringify(other.candidate) };
        self.sendMessage(message);
    };

    // Add the stream.
    peer.connection.addStream(this.localStreams[event.calleeStream]);

    // Generate SDP answer.
    window.setTimeout(function()
    {
        peer.connection.createAnswer().then(function( sdp )
        {
            // Set callee local description.
            peer.connection.setLocalDescription(sdp);

            let message = event;
            message["id"] = "answer";
            message["answer"] = JSON.stringify(sdp);
            self.sendMessage(message);
        });
    }, 500);
}

/**
 * Remote answer event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onRemoteAnswer = function( event )
{
    if( event.callId in this.peers )
    {
        // Set caller remote description.
        this.peers[event.callId].connection.setRemoteDescription(JSON.parse(event.answer));
    }
}

/**
 * Remote candidate event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onRemoteCandidate = function( event )
{
    if( event.callId in this.peers )
    {
        // Add the remote ICE candidate to the peer connection.
        this.peers[event.callId].connection.addIceCandidate(JSON.parse(event.candidate));
    }
}

/**
 * Call canceled event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onCallCanceled = function( event )
{
    this.closeCall(event.callId);

    this.emit("call_state", { callId: event.callId, state: "closed" });
}

/**
 * User hangup event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onUserHangup = function( event )
{
    this.closeCall(event.callId);

    this.emit("call_state", { callId: event.callId, state: "closed" });
}

/**
 * Handle the connection state change event.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.onConnectionStateChange = function( peer )
{
    if( !peer || !peer.connection )
    {
        return;
    }

    if( this.DEBUG ) console.log("%c" + "ICE Connection State" + "%o%o", this.debugStyle, peer.callId, peer.connection.iceConnectionState);

    switch( peer.connection.iceConnectionState )
    {
        case "failed":
        case "disconnected":
        case "closed":
        {
            this.hangup(peer.callId);
            break;
        }
        case "new":
        case "checking":
        case "completed":
        {
            if( this.DEBUG ) console.log("%c" + "call_state" + "%o%o", this.debugStyle, peer.callId, "ringing");
            this.emit("call_state", { callId: peer.callId, state: "ringing" });
            break;
        }
        case "connected":
        {
            let stream = RtcClient.getRemoteStream(peer.connection);
    
            if( this.DEBUG ) console.log("%c" + "call_state" + "%o%o", this.debugStyle, peer.callId, "open");
            this.emit("call_state", { callId: peer.callId, state: "open" });
    
            if( this.DEBUG ) console.log("%c" + "call_started" + "%o%o", this.debugStyle, peer.callId, stream);
            this.emit("call_started", { callId: peer.callId, stream: stream });

            this.getStats(peer.callId);

            break;
        }
    }
}

/**
 * Get the stats of the specified call.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.getStats = function( callId )
{
    if( !(callId in this.peers) )
    {
        return;
    }

    let peer = this.peers[callId];
    peer.connection.getStats(null).then(function( stats )
    {
        let callStats = { };

        // Get the stats of the succeeded candidate pair.
        let candidatePair = undefined;
        stats.forEach(report =>
        {
            if( report.type === "candidate-pair" && (report.selected === true || report.state === "succeeded") )
            {
                candidatePair = report;
            }
        });

        // Get the stats of the local and remote candidates.
        if( candidatePair )
        {
            stats.forEach(report =>
            {
                if( report.id === candidatePair.localCandidateId )
                {
                    callStats.localType = report.candidateType;
                    callStats.localAddress = report.address ?? report.ip;
                    callStats.localPort = report.port;
                    callStats.localProtocol = report.protocol;
                }
                if( report.id === candidatePair.remoteCandidateId )
                {
                    callStats.remoteType = report.candidateType;
                    callStats.remoteAddress = report.address ?? report.ip;
                    callStats.remotePort = report.port;
                    callStats.remoteProtocol = report.protocol;
                }
            });
        }

        if( this.DEBUG ) console.log("%c" + "call_stats" + "%o%o", this.debugStyle, callId, callStats);
        this.emit("call_stats", { callId: callId, stats: callStats });

    }.bind(this));
}

/**
 * Replace the local audio track.
 * @param {String} callId - The call id.
 * @param {MediaStreamTrack} track - The local audio track.
 */
RtcClient.prototype.replaceLocalAudioTrack = function( callId, track )
{
    if( !track || !(track instanceof MediaStreamTrack) )
    {
        return;
    }

    if( !(callId in this.peers) )
    {
        return;
    }

    let peer = this.peers[callId];
    if( !peer.connection )
    {
        return;
    }

    let senders = peer.connection.getSenders();
    for( let i = 0; i < senders.length; i++ )
    {
        let sender = senders[i];
        if( sender.track && sender.track.kind === "audio" )
        {
            sender.replaceTrack(track);
            return;
        }
    }
}

/**
 * Replace the local video track.
 * @param {String} callId - The call id.
 * @param {MediaStreamTrack} track - The local video track.
 */
RtcClient.prototype.replaceLocalVideoTrack = function( callId, track )
{
    if( !track || !(track instanceof MediaStreamTrack) )
    {
        return;
    }

    if( !(callId in this.peers) )
    {
        return;
    }

    let peer = this.peers[callId];
    if( !peer.connection )
    {
        return;
    }

    let senders = peer.connection.getSenders();
    for( let i = 0; i < senders.length; i++ )
    {
        let sender = senders[i];
        if( sender.track && sender.track.kind === "video" )
        {
            sender.replaceTrack(track);
            return;
        }
    }
}

/**
 * Replace the local stream. The stream must have 1 audio track and 1 video track.
 * @param {String} callId - The call id.
 * @param {MediaStream} stream - The local stream.
 */
RtcClient.prototype.replaceLocalStream = function( callId, stream )
{
    if( !stream || !(stream instanceof MediaStream) )
    {
        return;
    }

    if( !(callId in this.peers) )
    {
        return;
    }

    let peer = this.peers[callId];
    if( !peer.connection )
    {
        return;
    }

    let audioTracks = stream.getAudioTracks();
    let videoTracks = stream.getVideoTracks();
    if( audioTracks.length === 0 || videoTracks.length === 0 )
    {
        return;
    }

    this.replaceLocalAudioTrack(callId, audioTracks[0]);
    this.replaceLocalVideoTrack(callId, videoTracks[0]);
}

/**
 * Generate an id for a stream.
 * @return {String} The id of the stream.
 */
RtcClient.prototype.generateStreamId = function()
{
    let id = "";

    do
    {
        id = RtcClient.uuidv4();
    }
    while( id in this.localStreams );

    return id;
}

/**
 * Get the first remote audio track.
 * @param {RTCPeerConnection} peerConnection - The peer connection
 * @return {MediaStreamTrack} The remote audio track.
 */
RtcClient.getRemoteAudioTrack = function ( peerConnection )
{
    if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
    {
        return undefined;
    }

    let receivers = peerConnection.getReceivers();
    if( !receivers || receivers.length === 0 )
    {
        return undefined;
    }

    for( let i = 0; i < receivers.length; i++ )
    {
        let receiver = receivers[i];
        if( receiver.track.kind === "audio" )
        {
            return receiver.track;
        }
    }

    return undefined;
}

/**
 * Get the first remote video track.
 * @param {RTCPeerConnection} peerConnection - The peer connection
 * @return {MediaStreamTrack} The remote video track.
 */
RtcClient.getRemoteVideoTrack = function ( peerConnection )
{
    if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
    {
        return undefined;
    }

    let receivers = peerConnection.getReceivers();
    if( !receivers || receivers.length === 0 )
    {
        return undefined;
    }

    for( let i = 0; i < receivers.length; i++ )
    {
        let receiver = receivers[i];
        if( receiver.track.kind === "video" )
        {
            return receiver.track;
        }
    }

    return undefined;
}

/**
 * Get the remote stream of the peer connection. The peer connection must have 1 audio track and 1 video track.
 * @param {RTCPeerConnection} peerConnection - The peer connection.
 * @return {MediaStream} The remote stream.
 */
RtcClient.getRemoteStream = function( peerConnection )
{
    if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
    {
        return undefined;
    }

    let receivers = peerConnection.getReceivers();
    if( !receivers || receivers.length === 0 )
    {
        return undefined;
    }

    let audioTrack = undefined;
    for( let i = 0; i < receivers.length; i++ )
    {
        let receiver = receivers[i];
        if( receiver.track.kind === "audio" )
        {
            audioTrack = receiver.track;
            break;
        }
    }

    let videoTrack = undefined;
    for( let i = 0; i < receivers.length; i++ )
    {
        let receiver = receivers[i];
        if( receiver.track.kind === "video" )
        {
            videoTrack = receiver.track;
            break;
        }
    }

    if( !audioTrack || !videoTrack )
    {
        return undefined;
    }

    let stream = new MediaStream();
    stream.addTrack(audioTrack);
    stream.addTrack(videoTrack);

    return stream;
}

/**
 * Generate an unique identifier.
 * @return {String} The unique identifier.
 */
RtcClient.uuidv4 = function()
{
    // RFC 4122: https://www.ietf.org/rfc/rfc4122.txt
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
    {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Validates the specified string following a regular expression.
 * @param {String} str - The string to validate.
 * @return Whether or not the string is valid.
 */
RtcClient.validateString = function( str )
{
    if( !str )
    {
        return false;
    }

    let regex = new RegExp("^([a-zA-Z])(([a-zA-Z0-9]+)([.\-_]?))*([a-zA-Z0-9])$");
    return regex.test(str);
}

export { RtcClient };