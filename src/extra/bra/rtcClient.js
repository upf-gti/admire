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
    this.streams = { };

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
        "incoming_call": true,
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
        "hangup_response": false,
        "user_hangup": this.onUserHangup.bind(this)
    };
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
    // Connection.
    let peer = this.peers[callId];
    if( peer )
    {
        peer.close();
        peer = undefined;

        delete(this.peers[callId]);
    }

    // Stream.
    let stream = this.streams[callId];
    if( stream )
    {
        delete this.streams[callId];
    }

    this.emit("call_state", { callId: callId, state: "disconnected" });
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

        if( this.DEBUG ) console.log("%c%s%o", this.debugStyle, message.id, msg.data);

        if( this.messages[message.id] instanceof Function )
        {
            this.messages[message.id](message);
        }

        this.emit(message.id, message);
    }
    else
    {
        if( this.DEBUG ) console.log("%cunknown_message%o", this.debugStyle, msg.data);
    }
}

/**
 * Send a message to the server.
 * @param {Object} message - The message to send.
 */
RtcClient.prototype.sendMessage = function( message )
{
    let msg = JSON.stringify(message);
    if( this.DEBUG && message.id !== "ping" ) console.log("%c%s%o", this.debugStyle, message.id, msg);
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
    if( !this.events.hasOwnProperty(event) )
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
    if( this.events.hasOwnProperty(event) )
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

    if( this.events.hasOwnProperty(event) )
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
    if( this.userId )
    {
        return;
    }

    let message = { id: "register", userId: userId };
    this.sendMessage(message);
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
 * @param {MediaStream} stream - The stream to share.
 */
RtcClient.prototype.call = function( calleeId, stream )
{
    let streamId = this.generateStreamId();
    this.streams[streamId] = stream;

    let message = { id: "call", callerId: this.userId, calleeId: calleeId, callerStream: streamId };
    this.sendMessage(message);
}

/**
 * Accept a call with the specified stream.
 * @param {Object} call - The call message.
 * @param {MediaStream} stream - The stream to share.
 */
RtcClient.prototype.acceptCall = function( call, stream )
{
    let streamId = this.generateStreamId();
    this.streams[streamId] = stream;

    let message = call;
    message["id"] = "accept_call";
    message["calleeStream"] = streamId;
    this.sendMessage(message);
}

/**
 * Cancel a call.
 * @param {Object} call - The call message.
 */
RtcClient.prototype.cancelCall = function( call )
{
    let message = call;
    message["id"] = "cancel_call";
    this.sendMessage(message);
}

/**
 * Hangup a call.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.hangup = function( callId )
{
    this.closeCall(callId);

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
    }
}

/**
 * Call response event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onCallResponse = function( event )
{
    if( event.status === "error" )
    {
        // Free the stream.
        delete(this.streams[event.callerStream]);
    }
}

/**
 * Start call event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onStartCall = function( event )
{
    let self = this;

    let configuration = { "iceServers": this.iceServers };

    let peer = new RTCPeerConnection(configuration);
    this.peers[event.callId] = peer;

    // Track the peer connection state.
    peer.oniceconnectionstatechange = function( other )
    {
        self.onConnectionStateChange(event.callId);
    }

    // Generate ICE candidates.
    peer.onicecandidate = function( other )
    {
        if( !other || !other.candidate )
        {
            return;
        }

        let message = { id: "candidate", callId: event.callId, callerId: event.callerId, calleeId: event.calleeId, candidate: JSON.stringify(other.candidate) };
        self.sendMessage(message);
    };

    peer.onnegotiationneeded = function( other )
    {
        // Generate SDP offer.
        peer.createOffer().then(function( sdp )
        {
            // Set caller local description.
            peer.setLocalDescription(sdp);

            let message = event;
            message["id"] = "offer";
            message["offer"] = JSON.stringify(sdp);
            self.sendMessage(message);
        });
    };

    // Add the stream. This action triggers the ICE negotiation process.
    peer.addStream(this.streams[event.callerStream]);
}

/**
 * Remote offer event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onRemoteOffer = function( event )
{
    let self = this;

    let configuration = { "iceServers": this.iceServers };

    let peer = new RTCPeerConnection(configuration);
    this.peers[event.callId] = peer;

    // Track the peer connection state.
    peer.oniceconnectionstatechange = function( other )
    {
        self.onConnectionStateChange(event.callId);
    }

    // Set callee remote description.
    peer.setRemoteDescription(JSON.parse(event.offer));

    // Generate ICE candidates.
    peer.onicecandidate = function( other )
    {
        if( !other || !other.candidate )
        {
            return;
        }

        let message = { id: "candidate", callId: event.callId, callerId: event.callerId, calleeId: event.calleeId, candidate: JSON.stringify(other.candidate) };
        self.sendMessage(message);
    };

    // Add the stream.
    peer.addStream(this.streams[event.calleeStream]);

    // Generate SDP answer.
    window.setTimeout(function()
    {
        peer.createAnswer().then(function( sdp )
        {
            // Set callee local description.
            peer.setLocalDescription(sdp);

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
    // Set caller remote description.
    this.peers[event.callId].setRemoteDescription(JSON.parse(event.answer));
}

/**
 * Remote candidate event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onRemoteCandidate = function( event )
{
    // Add the remote ICE candidate to the peer connection.
    if( this.peers[event.callId] )
    {
        this.peers[event.callId].addIceCandidate(JSON.parse(event.candidate));
    }
}

/**
 * Call canceled event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onCallCanceled = function( event )
{
    // Free the stream.
    delete(this.streams[event.callerStream]);
}

/**
 * User hangup event handler.
 * @param {Object} event - The event object.
 */
RtcClient.prototype.onUserHangup = function( event )
{
    this.closeCall(event.callId);
}

/**
 * Handle the connection state change event.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.onConnectionStateChange = function( callId )
{
    let peer = this.peers[callId];

    if( peer.iceConnectionState === "failed" || peer.iceConnectionState === "disconnected" )
    {
        this.hangup(callId);
    }

    if( peer.iceConnectionState === "connected" )
    {
        this.getStats(callId);

        let stream = this.getRemoteStream(peer);

        if( this.DEBUG ) console.log("%ccall_started%o%o", this.debugStyle, callId, stream);

        this.emit("call_started", { callId: callId, stream: stream });
    }

    if( this.DEBUG ) console.log("%ccall_state%o%o", this.debugStyle, callId, peer.iceConnectionState);

    this.emit("call_state", { callId: callId, state: peer.iceConnectionState });
}

/**
 * Get the remote stream of the specified peer connection.
 * @param {String} peerConnection - The peer connection.
 */
RtcClient.prototype.getRemoteStream = function( peerConnection )
{
    if( !peerConnection )
    {
        return undefined;
    }

    let stream = new MediaStream();
    let receivers = peerConnection.getReceivers();
    for( let i = 0; i < receivers.length; i++ )
    {
        let receiver = receivers[i];
        stream.addTrack(receiver.track);
    }

    return stream;
}

/**
 * Get the stats of the specified call.
 * @param {String} callId - The call id.
 */
RtcClient.prototype.getStats = function( callId )
{
    let peer = this.peers[callId];
    if( !peer )
    {
        return;
    }

    peer.getStats(null).then(function( stats )
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
            //console.log(JSON.stringify(candidatePair));

            stats.forEach(report =>
            {
                if( report.id === candidatePair.localCandidateId )
                {
                    callStats.localType = report.candidateType;
                    callStats.localAddress = report.address ?? report.ip;
                    callStats.localPort = report.port;
                    callStats.localProtocol = report.protocol;

                    //console.log(JSON.stringify(report));
                }
                if( report.id === candidatePair.remoteCandidateId )
                {
                    callStats.remoteType = report.candidateType;
                    callStats.remoteAddress = report.address ?? report.ip;
                    callStats.remotePort = report.port;
                    callStats.remoteProtocol = report.protocol;

                    //console.log(JSON.stringify(report));
                }
            });
        }

        if( this.DEBUG ) console.log("%ccall_stats%o%o", this.debugStyle, callId, callStats);

        this.emit("call_stats", { callId: callId, stats: callStats });

    }.bind(this));
}

/**
 * Replace the stream used in the specified call.
 * @param {String} callId - The call id.
 * @param {MediaStream} stream - The stream to replace.
 */
RtcClient.prototype.replaceStream = function( callId, stream )
{
    let peer = this.peers[callId];
    if( !peer )
    {
        return;
    }

    Promise.all(peer.getSenders().map(sender => sender.replaceTrack(stream.getTracks().find(t => t.kind === sender.track.kind), stream)));
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
        id = this.uuidv4();
    }
    while( id in this.streams );

    return id;
}

/**
 * Generate an unique identifier.
 * @return {String} The unique identifier.
 */
RtcClient.prototype.uuidv4 = function()
{
    // RFC 4122: https://www.ietf.org/rfc/rfc4122.txt
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
    {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); // eslint-disable-line
        return v.toString(16);
    });
}

export { RtcClient };