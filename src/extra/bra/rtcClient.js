"use strict";

function Peer()
{
    var callId = undefined;
    var callerId = undefined;
    var calleeId = undefined;
    var callerStream = undefined;
    var calleeStream = undefined;
    var connection = undefined;
}

function RtcClient( settings )
{
//#region PRIVATE

    var defaults =
    {
        // Debug messages to console?
        debug: false,

        // Style used to debug messages.
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(74, 64%, 60%, 1)",

        // Period to send ping messages in ms.
        pingPeriod: 5 * 1000
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign(defaults, settings);

    var console = (settings.debug) ? window.console : undefined;
    var events = { };
    var socket = undefined;
    var keepAliveTimeout = undefined;
    var peers = { };
    var localStreams = { };

    var userId = undefined;
    var iceServers = undefined;

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
     * Open the web socket connection.
     * @param {String} url - The URL of the server.
     */
    var openWebSocket = function( url )
    {
        socket = new WebSocket(url);

        socket.onopen = onOpen;
        socket.onmessage = onMessage;
        socket.onclose = onClose;
    }

    /**
     * Close the web socket connection.
     */
    var closeWebSocket = function()
    {
        socket?.close();
    }

    /**
     * Close a call.
     * @param {String} callId - The call id.
     */
    var closeCall = function( callId )
    {
        if( !(callId in peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = peers[callId];
        delete(peers[callId]);
        if( peer.connection )
        {
            peer.connection.close();
        }

        let id = (peer.callerId === userId) ? peer.callerStream : peer.calleeStream;
        if( id in localStreams )
        {
            delete localStreams[id];
        }

        emit("call_state", { callId: callId, state: "closed" });
    }

    /**
     * Event handler called when the connection is opened.
     * @param {EventListener} event - The dispatched event.
     */
    var onOpen = function( event )
    {
        // Start the keep alive routine.
        keepAlive();

        emit("client_connected");
    }

    /**
     * Start a keep alive routine.
     */
    var keepAlive = function()
    {
        if( !socket )
        {
            console?.error("Websocket is undefined");
            return;
        }

        // Check whether the connection is open and ready to communicate.
        if( socket.readyState !== 1 )
        {
            console?.error("Connection not open, ready state " + socket.readyState);
            return;
        }

        ping();

        keepAliveTimeout = window.setTimeout(keepAlive, settings.pingPeriod);
    }

    /**
     * Send a ping to the server.
     */
    var ping = function()
    {
        let message = { id: "ping" };
        sendMessage(message);
    }

    /**
     * Event handler called when a message is received from the server.
     * @param {EventListener} msg - The message received.
     */
    var onMessage = function( msg )
    {
        let message = JSON.parse(msg.data);

        // Check the message.
        if( message.id in HANDLERS )
        {
            if( HANDLERS[message.id] === false )
            {
                return;
            }

            console?.log("%c%s" + "%o", settings.debugStyle, message.id, msg.data);

            if( HANDLERS[message.id] instanceof Function )
            {
                HANDLERS[message.id](message);
            }

            emit(message.id, message);
        }
        else
        {
            console?.log("%cunknown_message" + "%o", settings.debugStyle, msg.data);
        }
    }

    /**
     * Send a message to the server.
     * @param {Object} message - The message to send.
     */
    var sendMessage = function( message )
    {
        let msg = JSON.stringify(message);

        // Log all messages except pings.
        if( message.id !== "ping" )
        {
            console?.log("%c%s" + "%o", settings.debugStyle, message.id, msg);
        }

        socket.send(msg);
    }

    /**
     * Event handler called when the connection is closed.
     * @param {EventListener} event - The dispatched event.
     */
    var onClose = function( event )
    {
        userId = undefined;
        iceServers = undefined;

        // Stop the keep alive routine.
        window.clearTimeout(keepAliveTimeout);

        emit("client_disconnected");
    }

    /**
     * Connect to the server.
     * @param {String} url - The URL of the server.
     */
    var connect = function( url )
    {
        openWebSocket(url);
    }

    /**
     * Disconnect from the server.
     */
    var disconnect = function()
    {
        closeWebSocket();
    }

    /**
     * Register to the server.
     * @param {String} userId - The user id.
     */
    var register = function( userId )
    {
        if( !validateString(userId) )
        {
            console?.error("Invalid user id " + userId);
            return false;
        }

        if( this.userId )
        {
            console?.error("Client " + userId + " already registered");
            return false;
        }

        let message = { id: "register", userId: userId };
        sendMessage(message);

        return true;
    }

    /**
     * Unregister from the server.
     */
    var unregister = function()
    {
        if( !userId )
        {
            console?.error("Client not registered");
            return false;
        }

        // Hang up the calls.
        hangup();

        let message = { id: "unregister", userId: userId };
        sendMessage(message);

        return true;
    }

    /**
     * Call a user with the specified stream.
     * @param {String} calleeId - The callee id.
     * @param {MediaStream} localStream - The local stream to share.
     */
    var call = function( calleeId, localStream )
    {
        if( !validateString(calleeId) || userId === calleeId )
        {
            console?.error("Invalid user id " + calleeId);
            return false;
        }

        if( !localStream || !(localStream instanceof MediaStream) )
        {
            console?.error("Invalid local stream prototype");
            return false;
        }

        let id = generateStreamId();
        localStreams[id] = localStream;

        let message = { id: "call", callerId: userId, calleeId: calleeId, callerStream: id };
        sendMessage(message);

        return true;
    }

    /**
     * Accept a call with the specified stream.
     * @param {String} callId - The call id.
     * @param {MediaStream} localStream - The local stream to share.
     */
    var acceptCall = function( callId, localStream )
    {
        if( !(callId in peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        if( !localStream || !(localStream instanceof MediaStream) )
        {
            console?.error("Invalid local stream prototype");
            return false;
        }

        let id = generateStreamId();
        localStreams[id] = localStream;

        // Update the peer.
        let peer = peers[callId];
        peer.calleeStream = id;

        let message = { id: "accept_call", callId: peer.callId, callerId: peer.callerId, calleeId: peer.calleeId, callerStream: peer.callerStream, calleeStream: peer.calleeStream };
        sendMessage(message);
    }

    /**
     * Cancel a call.
     * @param {String} callId - The call id.
     */
    var cancelCall = function( callId )
    {
        if( !(callId in peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        // Delete the peer.
        let peer = peers[callId];
        delete peers[callId];

        let message = { id: "cancel_call", callId: peer.callId, callerId: peer.callerId, calleeId: peer.calleeId, callerStream: peer.callerStream };
        sendMessage(message);
    }

    /**
     * Hang up a call. If callId is undefined then all calls are hang up.
     * @param {String} callId - The call id.
     */
    var hangup = function( callId )
    {
        if( callId && !(callId in peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        if( !callId )
        {
            for( let callId in peers )
            {
                closeCall(callId);

                let message = { id: "hangup", callId: callId };
                sendMessage(message);
            }

            return;
        }

        closeCall(callId);

        let message = { id: "hangup", callId: callId };
        sendMessage(message);
    }

    /**
     * Register response event handler.
     * @param {Object} event - The event object.
     */
    var onRegisterResponse = function( event )
    {
        if( event.status === "ok" )
        {
            userId = event.userId;
            iceServers = JSON.parse(event.iceServers);
        }
    }

    /**
     * Unregister response event handler.
     * @param {Object} event - The event object.
     */
    var onUnregisterResponse = function( event )
    {
        if( event.status === "ok" )
        {
            userId = undefined;
            iceServers = undefined;
        }
    }

    /**
     * Call response event handler.
     * @param {Object} event - The event object.
     */
    var onCallResponse = function( event )
    {
        if( event.status === "ok" )
        {
            // Create the peer.
            let peer = new Peer();
            peer.callId = event.callId;
            peer.callerId = event.callerId;
            peer.calleeId = event.calleeId;
            peer.callerStream = event.callerStream;
            peers[peer.callId] = peer;
        }

        if( event.status === "error" )
        {
            if( event.callerStream in localStreams )
            {
                delete localStreams[event.callerStream];
            }
        }
    }

    /**
     * Incoming call event handler.
     * @param {Object} event - The event object.
     */
    var onIncomingCall = function( event )
    {
        // Create the peer.
        let peer = new Peer();
        peer.callId = event.callId;
        peer.callerId = event.callerId;
        peer.calleeId = event.calleeId;
        peer.callerStream = event.callerStream;
        peers[event.callId] = peer;
    }

    /**
     * Start call event handler.
     * @param {Object} event - The event object.
     */
    var onStartCall = function( event )
    {
        // Create the peer connection.
        let configuration = { "iceServers": iceServers };
        let peerConnection = new RTCPeerConnection(configuration);

        // Update the peer.
        let peer = peers[event.callId];
        peer.calleeStream = event.calleeStream;
        peer.connection = peerConnection;

        // Track the peer connection state.
        peer.connection.oniceconnectionstatechange = function( other )
        {
            onConnectionStateChange(peer);
        }

        // Generate ICE candidates.
        peer.connection.onicecandidate = function( other )
        {
            if( !other || !other.candidate )
            {
                return;
            }

            let message = { id: "candidate", callId: event.callId, callerId: event.callerId, calleeId: event.calleeId, candidate: JSON.stringify(other.candidate) };
            sendMessage(message);
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
                sendMessage(message);
            });
        };

        // Add the stream. This action triggers the ICE negotiation process.
        peer.connection.addStream(localStreams[event.callerStream]);
    }

    /**
     * Remote offer event handler.
     * @param {Object} event - The event object.
     */
    var onRemoteOffer = function( event )
    {
        // Create the peer connection.
        let configuration = { "iceServers": iceServers };
        let peerConnection = new RTCPeerConnection(configuration);

        // Update the peer.
        let peer = peers[event.callId];
        peer.connection = peerConnection;

        // Track the peer connection state.
        peer.connection.oniceconnectionstatechange = function( other )
        {
            onConnectionStateChange(peer);
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
            sendMessage(message);
        };

        // Add the stream.
        peer.connection.addStream(localStreams[event.calleeStream]);

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
                sendMessage(message);
            });
        }, 500);
    }

    /**
     * Remote answer event handler.
     * @param {Object} event - The event object.
     */
    var onRemoteAnswer = function( event )
    {
        if( event.callId in peers )
        {
            // Set caller remote description.
            peers[event.callId].connection.setRemoteDescription(JSON.parse(event.answer));
        }
    }

    /**
     * Remote candidate event handler.
     * @param {Object} event - The event object.
     */
    var onRemoteCandidate = function( event )
    {
        if( event.callId in peers )
        {
            // Add the remote ICE candidate to the peer connection.
            peers[event.callId].connection.addIceCandidate(JSON.parse(event.candidate));
        }
    }

    /**
     * Call canceled event handler.
     * @param {Object} event - The event object.
     */
    var onCallCanceled = function( event )
    {
        closeCall(event.callId);

        emit("call_state", { callId: event.callId, state: "closed" });
    }

    /**
     * User hangup event handler.
     * @param {Object} event - The event object.
     */
    var onUserHangup = function( event )
    {
        closeCall(event.callId);

        emit("call_state", { callId: event.callId, state: "closed" });
    }

    /**
     * Handle the connection state change event.
     * @param {String} callId - The call id.
     */
    var onConnectionStateChange = function( peer )
    {
        if( !peer || !peer.connection )
        {
            return;
        }

        console?.log("%c" + "ICE Connection State" + "%o%o", settings.debugStyle, peer.callId, peer.connection.iceConnectionState);

        switch( peer.connection.iceConnectionState )
        {
            case "failed":
            case "disconnected":
            case "closed":
            {
                hangup(peer.callId);
                break;
            }
            case "new":
            case "checking":
            case "completed":
            {
                console?.log("%c" + "call_state" + "%o%o", settings.debugStyle, peer.callId, "ringing");
                emit("call_state", { callId: peer.callId, state: "ringing" });
                break;
            }
            case "connected":
            {
                let stream = getRemoteStream(peer.connection);
        
                console?.log("%c" + "call_state" + "%o%o", settings.debugStyle, peer.callId, "open");
                emit("call_state", { callId: peer.callId, state: "open" });
        
                console?.log("%c" + "call_started" + "%o%o", settings.debugStyle, peer.callId, stream);
                emit("call_started", { callId: peer.callId, stream: stream });

                getStats(peer.callId);

                break;
            }
        }
    }

    /**
     * Get the stats of the specified call.
     * @param {String} callId - The call id.
     */
    var getStats = function( callId )
    {
        if( !(callId in peers) )
        {
            return;
        }

        let peer = peers[callId];
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

            console?.log("%c" + "call_stats" + "%o%o", settings.debugStyle, callId, callStats);
            emit("call_stats", { callId: callId, stats: callStats });

        }.bind(this));
    }

    /**
     * Get the first remote audio track.
     * @param {RTCPeerConnection} peerConnection - The peer connection
     * @return {MediaStreamTrack} The remote audio track.
     */
    var getRemoteAudioTrack = function ( peerConnection )
    {
        if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
        {
            console?.error("Invalid peer connection prototype");
            return undefined;
        }

        let receivers = peerConnection.getReceivers();
        if( !receivers || receivers.length === 0 )
        {
            console?.error("No receivers found");
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
    var getRemoteVideoTrack = function ( peerConnection )
    {
        if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
        {
            console?.error("Invalid peer connection prototype");
            return undefined;
        }

        let receivers = peerConnection.getReceivers();
        if( !receivers || receivers.length === 0 )
        {
            console?.error("No receivers found");
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
    var getRemoteStream = function( peerConnection )
    {
        if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
        {
            console?.error("Invalid peer connection prototype");
            return undefined;
        }

        let receivers = peerConnection.getReceivers();
        if( !receivers || receivers.length === 0 )
        {
            console?.error("No receivers found");
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

        if( !audioTrack )
        {
            console?.error("Audio track not found");
            return undefined;
        }

        if( !videoTrack )
        {
            console?.error("Video track not found");
            return undefined;
        }

        let stream = new MediaStream();
        stream.addTrack(audioTrack);
        stream.addTrack(videoTrack);

        return stream;
    }

    /**
     * Replace the local audio track.
     * @param {String} callId - The call id.
     * @param {MediaStreamTrack} track - The local audio track.
     */
    var replaceLocalAudioTrack = function( callId, track )
    {
        if( !track || !(track instanceof MediaStreamTrack) )
        {
            console?.error("Invalid local audio track prototype");
            return;
        }

        if( !(callId in peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = peers[callId];
        if( !peer.connection )
        {
            console?.error("Peer connection is undefined");
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
    var replaceLocalVideoTrack = function( callId, track )
    {
        if( !track || !(track instanceof MediaStreamTrack || track instanceof CanvasCaptureMediaStreamTrack) )
        {
            console?.error("Invalid local video track prototype");
            return;
        }

        if( !(callId in peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = peers[callId];
        if( !peer.connection )
        {
            console?.error("Peer connection is undefined");
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
    var replaceLocalStream = function( callId, stream )
    {
        if( !stream || !(stream instanceof MediaStream) )
        {
            console?.error("Invalid local stream prototype");
            return;
        }

        if( !(callId in peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = peers[callId];
        if( !peer.connection )
        {
            console?.error("Peer connection is undefined");
            return;
        }

        let audioTracks = stream.getAudioTracks();
        let videoTracks = stream.getVideoTracks();
        if( audioTracks.length === 0 || videoTracks.length === 0 )
        {
            console?.error("There must be at least 1 audio track and 1 video track");
            return;
        }

        replaceLocalAudioTrack(callId, audioTracks[0]);
        replaceLocalVideoTrack(callId, videoTracks[0]);
    }

    /**
     * Generate an id for a stream.
     * @return {String} The id of the stream.
     */
    var generateStreamId = function()
    {
        let id = "";

        do
        {
            id = uuidv4();
        }
        while( id in localStreams );

        return id;
    }

    /**
     * Generate an unique identifier.
     * @return {String} The unique identifier.
     */
    var uuidv4 = function()
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
    var validateString = function( str )
    {
        if( !str || str === "" )
        {
            return false;
        }

        let regex = new RegExp("^([a-zA-Z])(([a-zA-Z0-9]+)([.\-_]?))*([a-zA-Z0-9])$");
        return regex.test(str);
    }

    /**
     * Handlers used to listen messages from the server.
     *      function - The message is valid, emitted and managed.
     *      true - The message is valid, emitted and not managed.
     *      false - The message is valid, not emitted and not managed.
     *      undefined - The message is not valid.
     */
    const HANDLERS =
    {
        "pong": false,
        "register_response": onRegisterResponse,
        "unregister_response": onUnregisterResponse,
        "call_response": onCallResponse,
        "incoming_call": onIncomingCall,
        "accept_call_response": false,
        "cancel_call_response": false,
        "start_call": onStartCall,
        "offer_response": false,
        "remote_offer": onRemoteOffer,
        "answer_response": false,
        "remote_answer": onRemoteAnswer,
        "candidate_response": false,
        "remote_candidate": onRemoteCandidate,
        "call_canceled": onCallCanceled,
        "hangup_response": true,
        "user_hangup": onUserHangup
    };

//#endregion

//#region PUBLIC

    return {
        peers: peers,
        on: on,
        off: off,
        connect: connect,
        disconnect: disconnect,
        register: register,
        unregister: unregister,
        call: call,
        acceptCall: acceptCall,
        cancelCall: cancelCall,
        hangup: hangup,
        replaceLocalAudioTrack: replaceLocalAudioTrack,
        replaceLocalVideoTrack: replaceLocalVideoTrack,
        replaceLocalStream: replaceLocalStream
    };

//#endregion
}

export { RtcClient };