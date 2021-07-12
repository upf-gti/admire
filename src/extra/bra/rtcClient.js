export function RtcClient( settings )
{
//#region PRIVATE

    let _defaultSettings =
    {
        // Debug messages to console?
        debug: false,

        // Style used to debug messages.
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(74, 64%, 60%, 1)",

        // Period to send ping messages in ms.
        pingPeriod: 5 * 1000
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign(_defaultSettings, settings);

    let console = (settings.debug) ? window.console : null;

    let _events = { };
    let _socket = null;
    let _keepAliveTimeout = null;

    let _peers = { };
    let _localStreams = { };

    let _userId = null;
    let _configuration = { iceServers: null };

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
     * Connect to the server.
     * @param {String} url - The URL of the server.
     */
    let connect = function( url )
    {
        _socket = new WebSocket(url);

        _socket.onopen = onOpen;
        _socket.onmessage = onMessage;
        _socket.onclose = onClose;
    };

    /**
     * Event handler called when the connection is opened.
     * @param {EventListener} event - The dispatched event.
     */
    let onOpen = function( event )
    {
        // Start the keep alive routine.
        keepAlive();

        console?.log("%c" + "client_connected" + "%o", settings.debugStyle, _socket.url);

        emit("client_connected", { url: _socket.url });
    };

    /**
     * Event handler called when a message is received from the server.
     * @param {EventListener} msg - The message received.
     */
    let onMessage = function( msg )
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
    };

    /**
     * Send a message to the server.
     * @param {Object} message - The message to send.
     */
    let sendMessage = function( message )
    {
        let msg = JSON.stringify(message);

        // Log all messages except pings.
        if( message.id !== "ping" )
        {
            console?.log("%c%s" + "%o", settings.debugStyle, message.id, msg);
        }

        _socket.send(msg);
    };

    /**
     * Event handler called when the connection is closed.
     * @param {EventListener} event - The dispatched event.
     */
    let onClose = function( event )
    {
        _userId = null;
        _configuration.iceServers = null;

        // Stop the keep alive routine.
        window.clearTimeout(_keepAliveTimeout);

        console?.log("%c" + "client_disconnected" + "%o", settings.debugStyle, _socket.url);

        emit("client_disconnected", { url: _socket.url });
    };

    /**
     * Close a call.
     * @param {String} callId - The call ID.
     */
    let closeCall = function( callId )
    {
        if( !(callId in _peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = _peers[callId];
        delete(_peers[callId]);
        if( peer.connection )
        {
            peer.connection.close();
        }

        let id = (peer.callerId === _userId) ? peer.callerStream : peer.calleeStream;
        if( id in _localStreams )
        {
            delete _localStreams[id];
        }

        emit("call_state", { callId: callId, state: "closed" });
    };

    /**
     * Disconnect from the server.
     */
    let disconnect = function()
    {
        _socket?.close();
    };

    /**
     * Start a keep alive routine.
     */
    let keepAlive = function()
    {
        if( !_socket )
        {
            console?.error("Websocket is null");
            return;
        }

        // Check whether the connection is open and ready to communicate.
        if( _socket.readyState !== 1 )
        {
            console?.error("Connection not open, ready state " + _socket.readyState);
            return;
        }

        ping();

        _keepAliveTimeout = window.setTimeout(keepAlive, settings.pingPeriod);
    };
 
    /**
     * Send a ping to the server.
     */
    let ping = function()
    {
        let message = { id: "ping" };
        sendMessage(message);
    };

    /**
     * Register to the server.
     * @param {String} userId - The user ID.
     * @return {Boolean} Whether the register message has been sent.
     */
    let register = function( userId )
    {
        if( _userId )
        {
            console?.error("Client already registered");
            return false;
        }

        if( !validateId(userId) )
        {
            console?.error("Invalid user id " + userId);
            return false;
        }

        let message = { id: "register", userId: userId };
        sendMessage(message);

        return true;
    };

    /**
     * Unregister from the server.
     */
    let unregister = function()
    {
        if( !_userId )
        {
            console?.error("Client not registered");
            return false;
        }

        // Hang up the calls.
        hangup();

        let message = { id: "unregister", userId: _userId };
        sendMessage(message);

        return true;
    };

    /**
     * Call a user with the specified stream.
     * @param {String} calleeId - The callee ID.
     * @param {MediaStream} localStream - The local stream to share.
     */
    let call = function( calleeId, localStream )
    {
        if( _userId === calleeId || !validateId(calleeId) )
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
        _localStreams[id] = localStream;

        let message = { id: "call", callerId: _userId, calleeId: calleeId, callerStream: id };
        sendMessage(message);

        return true;
    };

    /**
     * Accept a call with the specified stream.
     * @param {String} callId - The call ID.
     * @param {MediaStream} localStream - The local stream to share.
     */
    let acceptCall = function( callId, localStream )
    {
        if( !(callId in _peers) )
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
        _localStreams[id] = localStream;

        // Update the peer.
        let peer = _peers[callId];
        peer.calleeStream = id;

        let message = { id: "accept_call", callId: peer.callId, callerId: peer.callerId, calleeId: peer.calleeId, callerStream: peer.callerStream, calleeStream: peer.calleeStream };
        sendMessage(message);
    };

    /**
     * Cancel a call.
     * @param {String} callId - The call ID.
     */
    let cancelCall = function( callId )
    {
        if( !(callId in _peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        // Delete the peer.
        let peer = _peers[callId];
        delete _peers[callId];

        let message = { id: "cancel_call", callId: peer.callId, callerId: peer.callerId, calleeId: peer.calleeId, callerStream: peer.callerStream };
        sendMessage(message);
    };

    /**
     * Hang up a call. If callId is undefined then all calls are hang up.
     * @param {String} callId - The call ID.
     */
    let hangup = function( callId )
    {
        if( callId && !(callId in _peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        if( !callId )
        {
            for( let callId in _peers )
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
    };

    /**
     * Register response event handler.
     * @param {Object} event - The event object.
     */
    let onRegisterResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _userId = event.userId;
            _configuration.iceServers = JSON.parse(event.iceServers);
        }
    };

    /**
     * Unregister response event handler.
     * @param {Object} event - The event object.
     */
    let onUnregisterResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _userId = null;
            _configuration.iceServers = null;
        }
    };

    /**
     * Call response event handler.
     * @param {Object} event - The event object.
     */
    let onCallResponse = function( event )
    {
        if( event.status === "ok" )
        {
            // Create the peer.
            let peer = new Peer();
            peer.callId = event.callId;
            peer.callerId = event.callerId;
            peer.calleeId = event.calleeId;
            peer.callerStream = event.callerStream;
            _peers[peer.callId] = peer;
        }

        if( event.status === "error" )
        {
            if( event.callerStream in _localStreams )
            {
                delete _localStreams[event.callerStream];
            }
        }
    };

    /**
     * Incoming call event handler.
     * @param {Object} event - The event object.
     */
    let onIncomingCall = function( event )
    {
        // Create the peer.
        let peer = new Peer();
        peer.callId = event.callId;
        peer.callerId = event.callerId;
        peer.calleeId = event.calleeId;
        peer.callerStream = event.callerStream;
        _peers[event.callId] = peer;
    };

    /**
     * Start call event handler.
     * @param {Object} event - The event object.
     */
    let onStartCall = function( event )
    {
        // Create the peer connection.
        let peerConnection = new RTCPeerConnection(_configuration);
        let peer = _peers[event.callId];
        peer.calleeStream = event.calleeStream;
        peer.connection = peerConnection;

        // Track the peer connection state.
        peer.connection.oniceconnectionstatechange = function( other )
        {
            onIceConnectionStateChange(peer);
        }

        // Generate candidates.
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
        peer.connection.addStream(_localStreams[event.callerStream]);
    };

    /**
     * Remote offer event handler.
     * @param {Object} event - The event object.
     */
    let onRemoteOffer = function( event )
    {
        // Create the peer connection.
        let peerConnection = new RTCPeerConnection(_configuration);
        let peer = _peers[event.callId];
        peer.connection = peerConnection;

        // Track the peer connection state.
        peer.connection.oniceconnectionstatechange = function( other )
        {
            onIceConnectionStateChange(peer);
        }

        // Set callee remote description.
        peer.connection.setRemoteDescription(JSON.parse(event.offer));

        // Gather the pending candidates.
        peer.gatherIceCandidates();

        // Generate candidates.
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
        peer.connection.addStream(_localStreams[event.calleeStream]);

        // Generate answer.
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
    };

    /**
     * Remote answer event handler.
     * @param {Object} event - The event object.
     */
    let onRemoteAnswer = function( event )
    {
        if( event.callId in _peers )
        {
            // Set caller remote description.
            _peers[event.callId].connection.setRemoteDescription(JSON.parse(event.answer));
        }
    };

    /**
     * Remote candidate event handler.
     * @param {Object} event - The event object.
     */
    let onRemoteCandidate = function( event )
    {
        if( event.callId in _peers )
        {
            let peer = _peers[event.callId];
            let candidate = JSON.parse(event.candidate);
            peer.addIceCandidate(candidate);
        }
    };

    /**
     * Call canceled event handler.
     * @param {Object} event - The event object.
     */
    let onCallCanceled = function( event )
    {
        closeCall(event.callId);

        emit("call_state", { callId: event.callId, state: "closed" });
    };

    /**
     * User hangup event handler.
     * @param {Object} event - The event object.
     */
    let onUserHangup = function( event )
    {
        closeCall(event.callId);

        emit("call_state", { callId: event.callId, state: "closed" });
    };

    /**
     * Handle the connection state change event.
     * @param {String} callId - The call ID.
     */
    let onIceConnectionStateChange = async function( peer )
    {
        if( !peer || !peer.connection )
        {
            return;
        }

        console?.log("%c" + "ICE Connection State" + "%o%o", settings.debugStyle, peer.callId, peer.connection.iceConnectionState);
        console?.log("%c" + "call_state" + "%o%o", settings.debugStyle, peer.callId, peer.connection.iceConnectionState);
        emit("call_state", { callId: peer.callId, state: peer.connection.iceConnectionState });

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
                break;
            }
            case "connected":
            {
                let stream = getRemoteStream(peer.connection);
        
                console?.log("%c" + "call_started" + "%o%o", settings.debugStyle, peer.callId, stream);
                emit("call_started", { callId: peer.callId, stream: stream });

                let stats = await peer.getStats();
                console?.log("%c" + "stats" + "%o%o", settings.debugStyle, stats);

                break;
            }
            default:
            {
                break;
            }
        }
    };

    /**
     * Get the first remote audio track.
     * @param {RTCPeerConnection} peerConnection - The peer connection
     * @return {MediaStreamTrack} The remote audio track.
     */
    let getRemoteAudioTrack = function ( peerConnection )
    {
        if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
        {
            console?.error("Invalid peer connection prototype");
            return null;
        }

        let receivers = peerConnection.getReceivers();
        if( !receivers || receivers.length === 0 )
        {
            console?.error("No receivers found");
            return null;
        }

        for( let i = 0; i < receivers.length; i++ )
        {
            let receiver = receivers[i];
            if( receiver.track.kind === "audio" )
            {
                return receiver.track;
            }
        }

        return null;
    };

    /**
     * Get the first remote video track.
     * @param {RTCPeerConnection} peerConnection - The peer connection
     * @return {MediaStreamTrack} The remote video track.
     */
    let getRemoteVideoTrack = function ( peerConnection )
    {
        if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
        {
            console?.error("Invalid peer connection prototype");
            return null;
        }

        let receivers = peerConnection.getReceivers();
        if( !receivers || receivers.length === 0 )
        {
            console?.error("No receivers found");
            return null;
        }

        for( let i = 0; i < receivers.length; i++ )
        {
            let receiver = receivers[i];
            if( receiver.track.kind === "video" )
            {
                return receiver.track;
            }
        }

        return null;
    };

    /**
     * Get the remote stream of the peer connection. The peer connection must have 1 audio track and 1 video track.
     * @param {RTCPeerConnection} peerConnection - The peer connection.
     * @return {MediaStream} The remote stream.
     */
    let getRemoteStream = function( peerConnection )
    {
        if( !peerConnection || !(peerConnection instanceof RTCPeerConnection) )
        {
            console?.error("Invalid peer connection prototype");
            return null;
        }

        let receivers = peerConnection.getReceivers();
        if( !receivers || receivers.length === 0 )
        {
            console?.error("No receivers found");
            return null;
        }

        let audioTrack = null;
        for( let i = 0; i < receivers.length; i++ )
        {
            let receiver = receivers[i];
            if( receiver.track.kind === "audio" )
            {
                audioTrack = receiver.track;
                break;
            }
        }

        let videoTrack = null;
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
            return null;
        }

        if( !videoTrack )
        {
            console?.error("Video track not found");
            return null;
        }

        let stream = new MediaStream();
        stream.addTrack(audioTrack);
        stream.addTrack(videoTrack);

        return stream;
    };

    /**
     * Replace the local audio track.
     * @param {String} callId - The call ID.
     * @param {MediaStreamTrack} track - The local audio track.
     */
    let replaceLocalAudioTrack = function( callId, track )
    {
        if( !track || !(track instanceof MediaStreamTrack) )
        {
            console?.error("Invalid local audio track prototype");
            return;
        }

        if( !(callId in _peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = _peers[callId];
        if( !peer.connection )
        {
            console?.error("Peer connection is null");
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
    };

    /**
     * Replace the local video track.
     * @param {String} callId - The call ID.
     * @param {MediaStreamTrack} track - The local video track.
     */
    let replaceLocalVideoTrack = function( callId, track )
    {
        if( !track || !(track instanceof MediaStreamTrack || track instanceof CanvasCaptureMediaStreamTrack) )
        {
            console?.error("Invalid local video track prototype");
            return;
        }

        if( !(callId in _peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = _peers[callId];
        if( !peer.connection )
        {
            console?.error("Peer connection is null");
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
    };

    /**
     * Replace the local stream. The stream must have 1 audio track and 1 video track.
     * @param {String} callId - The call ID.
     * @param {MediaStream} stream - The local stream.
     */
    let replaceLocalStream = function( callId, stream )
    {
        if( !stream || !(stream instanceof MediaStream) )
        {
            console?.error("Invalid local stream prototype");
            return;
        }

        if( !(callId in _peers) )
        {
            console?.error("Call " + callId + " not found");
            return;
        }

        let peer = _peers[callId];
        if( !peer.connection )
        {
            console?.error("Peer connection is null");
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
    };

    /**
     * Generate an id for a stream.
     * @return {String} The ID of the stream.
     */
    let generateStreamId = function()
    {
        let id = "";

        do
        {
            id = uuidv4();
        }
        while( id in _localStreams );

        return id;
    };

    /**
     * Generate an unique identifier.
     * @return {String} The unique identifier.
     */
    let uuidv4 = function()
    {
        // RFC 4122: https://www.ietf.org/rfc/rfc4122.txt
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
        {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    /**
     * Validates the specified ID following a regular expression.
     * @param {String} id - The ID to validate.
     * @return Whether or not the ID is valid.
     */
    let validateId = function( id )
    {
        if( !id || id === "" )
        {
            return false;
        }

        let regex = new RegExp("^([a-zA-Z])(([a-zA-Z0-9]+)([.\-_]?))*([a-zA-Z0-9])$");
        return regex.test(id);
    };

    /**
     * Handlers used to listen messages from the server.
     *      function - The message is valid, emitted and managed.
     *      true - The message is valid, emitted and not managed.
     *      false - The message is valid, not emitted and not managed.
     *      undefined - The message is not valid.
     */
    const HANDLERS =
    {
        "pong":                     false,
        "register_response":        onRegisterResponse,
        "unregister_response":      onUnregisterResponse,
        "call_response":            onCallResponse,
        "incoming_call":            onIncomingCall,
        "accept_call_response":     false,
        "cancel_call_response":     false,
        "start_call":               onStartCall,
        "offer_response":           false,
        "remote_offer":             onRemoteOffer,
        "answer_response":          false,
        "remote_answer":            onRemoteAnswer,
        "candidate_response":       false,
        "remote_candidate":         onRemoteCandidate,
        "call_canceled":            onCallCanceled,
        "hangup_response":          true,
        "user_hangup":              onUserHangup
    };

//#endregion

//#region PUBLIC

    return {
        get peers() { return _peers; },
        on,
        off,
        connect,
        disconnect,
        register,
        unregister,
        call,
        acceptCall,
        cancelCall,
        hangup,
        replaceLocalAudioTrack,
        replaceLocalVideoTrack,
        replaceLocalStream
    };

//#endregion
}

function Peer()
{
//#region PRIVATE

    let _callId = null;
    let _callerId = null;
    let _calleeId = null;
    let _callerStream = null;
    let _calleeStream = null;
    let _connection = null;
    let _candidates = [];

    /**
     * Add a candidate or save it for gathering.
     * @param {Object} candidate 
     */
    let addIceCandidate = function( candidate )
    {
        if( !_connection )
        {
            _candidates.push(candidate);
        }
        else
        {
            _connection.addIceCandidate(candidate);
        }
    };

    /**
     * Gather the pending candidates.
     */
    let gatherIceCandidates = function()
    {
        if( _candidates.length > 0 )
        {
            _candidates.forEach(candidate => _connection.addIceCandidate(candidate));
            _candidates = [];
        }
    };

    /**
     * Get the peer stats.
     * @return {Object} The peer stats.
     */
    let getStats = async function()
    {
        if( !_connection )
        {
            return;
        }

        return await _connection.getStats(null).then(function( stats )
        {
            let peerStats = { callId: _callId };

            // Get the stats of the succeeded candidate pair.
            let candidatePair = null;
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
                        peerStats.localType = report.candidateType;
                        peerStats.localAddress = report.address ?? report.ip;
                        peerStats.localPort = report.port;
                        peerStats.localProtocol = report.protocol;
                    }
                    if( report.id === candidatePair.remoteCandidateId )
                    {
                        peerStats.remoteType = report.candidateType;
                        peerStats.remoteAddress = report.address ?? report.ip;
                        peerStats.remotePort = report.port;
                        peerStats.remoteProtocol = report.protocol;
                    }
                });
            }

            return Promise.resolve(peerStats);
        });
    };

//#endregion

//#region PUBLIC

    return {
        get callId() { return _callId; },
        set callId( value ) { _callId = value; },
        get callerId() { return _callerId; },
        set callerId( value ) { _callerId = value; },
        get calleeId() { return _calleeId; },
        set calleeId( value ) { _calleeId = value; },
        get callerStream() { return _callerStream; },
        set callerStream( value ) { _callerStream = value; },
        get calleeStream() { return _calleeStream; },
        set calleeStream( value ) { _calleeStream = value; },
        get connection() { return _connection; },
        set connection( value ) { _connection = value; },
        addIceCandidate,
        gatherIceCandidates,
        getStats
    };

//#endregion
}