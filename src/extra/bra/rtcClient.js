export function RTCClient( settings )
{
//#region PRIVATE

    let _settings =
    {
        // Debug messages to console?
        debug: false,

        // Style used to debug messages.
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(74, 64%, 60%, 1)",

        // Period to send ping messages in ms.
        pingPeriod: 5 * 1000,

        // The default stream to send.
        defaultStream: new MediaStream()
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign(_settings, settings);

    let console = (settings.debug) ? window.console : null;

    let _events = { };
    let _socket = null;
    let _keepAliveTimeout = null;
    let _calls = { };

    let _userId = null;
    let _rtcConfiguration = { iceServers: null };

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
     * Get the call identified by the specified ID.
     * @param {String} callId - The call ID.
     * @return The call.
     */
    let getCall = function( callId )
    {
        return (callId in _calls) ? _calls[callId] : null;
    };
 
    /**
     * Get all the calls.
     * @return The calls collection.
     */
    let getCalls = function()
    {
        return _calls;
    };

    /**
     * Connect to the server.
     * @param {String} url - The URL of the server.
     */
    let connect = function( url )
    {
        if( _socket && _socket.readyState != 3 ) // Closed.
        {
            return;
        }

        _socket = new WebSocket(url);

        _socket.onopen = onOpen;
        _socket.onmessage = onMessage;
        _socket.onclose = onClose;
    };

    /**
     * Disconnect from the server.
     */
    let disconnect = function()
    {
        if( !_socket || _socket.readyState == 1 ) // Open.
        {
            return;
        }

        _socket?.close();
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
     * Event handler called when the connection is closed.
     * @param {EventListener} event - The dispatched event.
     */
    let onClose = function( event )
    {
        _userId = null;
        _rtcConfiguration.iceServers = null;

        // Stop the keep alive routine.
        window.clearTimeout(_keepAliveTimeout);

        console?.log("%c" + "client_disconnected" + "%o", settings.debugStyle, _socket.url);
        emit("client_disconnected", { url: _socket.url });
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
     * Start a keep alive routine.
     */
    let keepAlive = function()
    {
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
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
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
            return false;
        }

        let message =
        {
            id: "ping"
        };
        sendMessage(message);

        return true;
    };

    /**
     * Register to the server.
     * @param {String} userId - The user ID.
     * @return {Boolean} Whether the register message has been sent.
     */
    let register = function( userId )
    {
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
            return false;
        }

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

        let message =
        {
            id: "register",
            userId: userId
        };
        sendMessage(message);

        return true;
    };

    /**
     * Unregister from the server.
     */
    let unregister = function()
    {
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
            return false;
        }

        if( !_userId )
        {
            console?.error("Client not registered");
            return false;
        }

        hangup();

        let message =
        {
            id: "unregister",
            userId: _userId
        };
        sendMessage(message);

        return true;
    };

    /**
     * Call a user with the specified stream.
     * @param {String} calleeId - The callee ID.
     */
    let call = function( calleeId )
    {
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
            return false;
        }

        if( _userId === calleeId || !validateId(calleeId) )
        {
            console?.error("Invalid user id " + calleeId);
            return false;
        }

        let message =
        {
            id: "call",
            callerId: _userId,
            calleeId: calleeId
        };
        sendMessage(message);

        return true;
    };

    /**
     * Close a call.
     * @param {String} callId - The call ID.
     */
    let closeCall = function( callId )
    {
        if( !(callId in _calls) )
        {
            return false;
        }

        let call = _calls[callId];
        call.connection?.close();
        delete(_calls[callId]);

        emit("call_closed", { call: call });

        return true;
    };

    /**
     * Accept a call.
     * @param {String} callId - The call ID.
     */
    let acceptCall = function( callId )
    {
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
            return false;
        }

        if( !(callId in _calls) )
        {
            console?.error("Call " + callId + " not found");
            return false;
        }

        let call = _calls[callId];

        let message =
        {
            id: "accept_call",
            callId: call.callId,
            callerId: call.callerId,
            calleeId: call.calleeId
        };
        sendMessage(message);

        return true;
    };

    /**
     * Cancel a call.
     * @param {String} callId - The call ID.
     */
    let cancelCall = function( callId )
    {
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
            return false;
        }

        if( !(callId in _calls) )
        {
            console?.error("Call " + callId + " not found");
            return false;
        }

        // Delete the call.
        let call = _calls[callId];
        delete _calls[callId];

        let message =
        {
            id: "cancel_call",
            callId: call.callId,
            callerId: call.callerId,
            calleeId: call.calleeId
        };
        sendMessage(message);

        return true;
    };

    /**
     * Hang up a call. If call ID is undefined then all calls are hang up.
     * @param {String} callId - The call ID.
     */
    let hangup = function( callId )
    {
        if( !_socket || _socket.readyState !== 1 ) // Open.
        {
            console?.error("Socket state: " + _socket.readyState);
            return false;
        }

        if( callId && !(callId in _calls) )
        {
            console?.error("Call " + callId + " not found");
            return false;
        }

        if( callId )
        {
            closeCall(callId);

            let message =
            {
                id: "hangup",
                callId: callId
            };
            sendMessage(message);

            return true;
        }
        else // Hang up all calls.
        {
            for( let callId in _calls )
            {
                closeCall(callId);

                let message =
                {
                    id: "hangup",
                    callId: callId
                };
                sendMessage(message);
            }

            return true;
        }
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
            _rtcConfiguration.iceServers = JSON.parse(event.iceServers);
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
            _rtcConfiguration.iceServers = null;
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
            // Create the call.
            let call = new RTCCall(event.callId, event.callerId, event.calleeId);
            _calls[call.callId] = call;
        }
    };

    /**
     * Incoming call event handler.
     * @param {Object} event - The event object.
     */
    let onIncomingCall = function( event )
    {
        // Create the call.
        let call = new RTCCall(event.callId, event.callerId, event.calleeId);
        _calls[event.callId] = call;
    };

    /**
     * Call accepted event handler.
     * @param {Object} event - The event object.
     */
    let onCallAccepted = function( event )
    {
        // Create the peer connection.
        let peerConnection = new RTCPeerConnection(_rtcConfiguration);
        let call = _calls[event.callId];
        call.connection = peerConnection;

        // Handle the peer connection lifecycle.
        call.connection.oniceconnectionstatechange = function( other )
        {
            onIceConnectionStateChange(call);
        }

        // Generate candidates.
        call.connection.onicecandidate = function( other )
        {
            if( !other.candidate || other.candidate === "" ) // Empty if the RTCIceCandidate is an "end of candidates" indicator.
            {
                return;
            }

            let message =
            {
                id: "candidate",
                callId: event.callId,
                callerId: event.callerId,
                calleeId: event.calleeId,
                candidate: JSON.stringify(other.candidate)
            };
            sendMessage(message);
        };

        call.connection.onnegotiationneeded = function( other )
        {
            // Generate offer.
            call.connection.createOffer().then(function( sdp )
            {
                // Set caller local description.
                call.connection.setLocalDescription(sdp);

                let message =
                {
                    id: "offer",
                    callId: event.callId,
                    callerId: event.callerId,
                    calleeId: event.calleeId,
                    offer: JSON.stringify(sdp)
                };
                sendMessage(message);
            });
        };

        // Add the tracks. This action triggers the ICE negotiation process.
        let tracks = _settings.defaultStream.getTracks();
        tracks.forEach(track => call.connection.addTrack(track));
    };

    /**
     * Call canceled event handler.
     * @param {Object} event - The event object.
     */
    let onCallCanceled = function( event )
    {
        closeCall(event.callId);
    };

    /**
     * Remote offer event handler.
     * @param {Object} event - The event object.
     */
    let onRemoteOffer = function( event )
    {
        // Create the peer connection.
        let peerConnection = new RTCPeerConnection(_rtcConfiguration);
        let call = _calls[event.callId];
        call.connection = peerConnection;

        // Handle the peer connection lifecycle.
        call.connection.oniceconnectionstatechange = function( other )
        {
            onIceConnectionStateChange(call);
        }

        // Set callee remote description.
        call.connection.setRemoteDescription(JSON.parse(event.offer));

        // Gather the pending candidates.
        call.gatherPendingCandidates();

        // Generate candidates.
        call.connection.onicecandidate = function( other )
        {
            if( !other.candidate || other.candidate === "" ) // Empty if the RTCIceCandidate is an "end of candidates" indicator.
            {
                return;
            }

            let message =
            {
                id: "candidate",
                callId: event.callId,
                callerId: event.callerId,
                calleeId: event.calleeId,
                candidate: JSON.stringify(other.candidate)
            };
            sendMessage(message);
        };

        // Add the tracks.
        let tracks = _settings.defaultStream.getTracks();
        tracks.forEach(track => call.connection.addTrack(track));

        // Generate answer.
        window.setTimeout(function()
        {
            call.connection.createAnswer().then(function( sdp )
            {
                // Set callee local description.
                call.connection.setLocalDescription(sdp);

                let message =
                {
                    id: "answer",
                    callId: event.callId,
                    callerId: event.callerId,
                    calleeId: event.calleeId,
                    answer: JSON.stringify(sdp)
                };
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
        if( event.callId in _calls )
        {
            let answer = JSON.parse(event.answer);

            // Set caller remote description.
            _calls[event.callId].connection.setRemoteDescription(answer);
        }
    };

    /**
     * Remote candidate event handler.
     * @param {Object} event - The event object.
     */
    let onRemoteCandidate = function( event )
    {
        let candidate = JSON.parse(event.candidate);
        if( !candidate || !candidate.candidate || candidate.candidate === "" ) // Empty if the RTCIceCandidate is an "end of candidates" indicator.
        {
            return;
        }

        if( event.callId in _calls )
        {
            let call = _calls[event.callId];
            call.addCandidate(candidate);
        }
    };

    /**
     * User hangup event handler.
     * @param {Object} event - The event object.
     */
    let onUserHangup = function( event )
    {
        closeCall(event.callId);
    };

    /**
     * Handle the ICE connection state change event.
     * @param {RTCCall} call - The call.
     */
    let onIceConnectionStateChange = async function( call )
    {
        let state = call.getState();
        console?.log("%c" + "Connection State" + "%o%o", settings.debugStyle, call.callId, state);

        switch( state )
        {
            case "failed":
            case "disconnected":
            case "closed":
            {
                hangup(call.callId);
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
                let stream = call.getRemoteStream();
                console?.log("%c" + "call_opened" + "%o%o", settings.debugStyle, call.callId, stream);
                emit("call_opened", { call: call, stream: stream });

                break;
            }
            default:
            {
                break;
            }
        }
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
        "call_accepted":            onCallAccepted,
        "call_canceled":            onCallCanceled,
        "offer_response":           false,
        "remote_offer":             onRemoteOffer,
        "answer_response":          false,
        "remote_answer":            onRemoteAnswer,
        "candidate_response":       false,
        "remote_candidate":         onRemoteCandidate,
        "hangup_response":          true,
        "user_hangup":              onUserHangup
    };

//#endregion

//#region PUBLIC

    return {
        on,
        off,
        getCall,
        getCalls,
        connect,
        disconnect,
        register,
        unregister,
        call,
        acceptCall,
        cancelCall,
        hangup
    };

//#endregion
}

export function RTCCall( callId, callerId, calleeId )
{
//#region PRIVATE

    let _callId = callId;
    let _callerId = callerId;
    let _calleeId = calleeId;

    let _connection = null;
    let _candidates = [];

    /**
     * Get the call state.
     * @return {String} The call state.
     */
    let getState = function()
    {
        return (_connection) ? _connection.iceConnectionState : "closed";
    }

    /**
     * Get the call stats.
     * @return {Object} The call stats.
     */
    let getStats = async function()
    {
        if( !_connection )
        {
            return;
        }

        return await _connection.getStats(null).then(function( stats )
        {
            let callStats = { callId: _callId, callerId: _callerId, calleeId: _calleeId };

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

            return Promise.resolve(callStats);
        });
    };

    /**
     * Add a candidate or save it for gathering.
     * @param {Object} candidate 
     */
    let addCandidate = function( candidate )
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
    let gatherPendingCandidates = function()
    {
        if( _candidates.length > 0 )
        {
            _candidates.forEach(candidate => _connection.addIceCandidate(candidate));
            _candidates = [];
        }
    };

    /**
     * Get the remote audio track specified by index.
     * @param {Number} index
     * @return {MediaStreamTrack} The audio track.
     */
    let getRemoteAudioTrack = function ( index = 0 )
    {
        if( !_connection )
        {
            return null;
        }

        let receivers = _connection.getReceivers();
        if( !receivers )
        {
            return null;
        }

        let tracks = [];
        for( let i = 0; i < receivers.length; i++ )
        {
            let receiver = receivers[i];
            if( receiver.track.kind === "audio" )
            {
                tracks.push(receiver.track);
            }
        }

        if( index >= 0 && index < tracks.length )
        {
            return tracks[index];
        }

        return null;
    };

    /**
     * Get the remote video track specified by index.
     * @param {Number} index
     * @return {MediaStreamTrack} The video track.
     */
    let getRemoteVideoTrack = function ( index = 0 )
    {
        if( !_connection )
        {
            return null;
        }

        let receivers = _connection.getReceivers();
        if( !receivers )
        {
            return null;
        }

        let tracks = [];
        for( let i = 0; i < receivers.length; i++ )
        {
            let receiver = receivers[i];
            if( receiver.track.kind === "video" )
            {
                tracks.push(receiver.track);
            }
        }

        if( index >= 0 && index < tracks.length )
        {
            return tracks[index];
        }

        return null;
    };

    /**
     * Get the remote stream of the peer connection composed by all the audio and video tracks.
     * @return {MediaStream} The remote stream.
     */
    let getRemoteStream = function()
    {
        if( !_connection )
        {
            return null;
        }

        let receivers = _connection.getReceivers();
        if( !receivers )
        {
            return null;
        }

        let tracks = [];
        for( let i = 0; i < receivers.length; i++ )
        {
            let receiver = receivers[i];
            if( receiver.track )
            {
                tracks.push(receiver.track);
            }
        }

        if( tracks.length === 0 )
        {
            return null;
        }

        let stream = new MediaStream();
        for( let i = 0; i < tracks.length; i++ )
        {
            let track = tracks[i];
            stream.addTrack(track);
        }

        return stream;
    };

    /**
     * Replace the local audio track specified by index.
     * @param {MediaStreamTrack} track - The audio track.
     * @param {Number} index
     * @return Whether the track has been replaced.
     */
    let replaceLocalAudioTrack = function( track, index = 0 )
    {
        if( !_connection || !track )
        {
            return false;
        }

        let audioSenders = [];
        let senders = _connection.getSenders();
        for( let i = 0; i < senders.length; i++ )
        {
            let sender = senders[i];
            if( sender.track && sender.track.kind === "audio" )
            {
                audioSenders.push(sender);
            }
        }

        if( index >= 0 && index < audioSenders.length )
        {
            audioSenders[index].replaceTrack(track);
            return true;
        }

        return false;
    };

    /**
     * Replace the local video track specified by index.
     * @param {MediaStreamTrack} track - The video track.
     * @param {Number} index
     * @returns Whether the track has been replaced.
     */
    let replaceLocalVideoTrack = function( track, index = 0 )
    {
        if( !_connection || !track )
        {
            return false;
        }

        let videoSenders = [];
        let senders = _connection.getSenders();
        for( let i = 0; i < senders.length; i++ )
        {
            let sender = senders[i];
            if( sender.track && sender.track.kind === "video" )
            {
                videoSenders.push(sender);
            }
        }

        if( index >= 0 && index < videoSenders.length )
        {
            videoSenders[index].replaceTrack(track);
            return true;
        }

        return false;
    };

//#endregion

//#region PUBLIC

    return {
        get callId() { return _callId; },
        get callerId() { return _callerId; },
        get calleeId() { return _calleeId; },
        get connection() { return _connection; },
        set connection( value ) { _connection = value; },
        getState,
        getStats,
        addCandidate,
        gatherPendingCandidates,
        getRemoteAudioTrack,
        getRemoteVideoTrack,
        getRemoteStream,
        replaceLocalAudioTrack,
        replaceLocalVideoTrack
    };

//#endregion
}