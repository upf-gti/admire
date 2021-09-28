export const RTCEvent =
{
	ClientConnected:        "client_connected",
	ClientDisconnected:     "client_disconnected",
    IncomingCall:           "incoming_call",
    CallAccepted:           "call_accepted",
    CallCanceled:           "call_canceled",
    CallOpened:             "call_opened",
    CallClosed:             "call_closed",
    UserHangup:             "user_hangup"
};

export function RTCClient( settings )
{
//#region Variables
    let defaultSettings =
    {
        debug: false,
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(74, 64%, 60%, 1)",
        pingPeriod: 5 * 1000,
        defaultStream: new MediaStream()
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign({ }, defaultSettings, settings);

    let console = (settings.debug) ? window.console : null;

    let responses = { };
    let events = { };

    let calls = { };
    let socket = null;
    let keepAliveTimeout = null;

    let userId = null;
    let rtcConfiguration = { iceServers: null };
//#endregion

//#region Methods
    /**
     * Add a function that will be called whenever the specified event is emitted.
     */
    let on = function( event, listener )
    {
        if( Object.values(RTCEvent).indexOf(event) == -1 )
        {
            return false;
        }

        if( !(listener instanceof Function) )
        {
            return false;
        }

        if( typeof events[event] !== "object" )
        {
            events[event] = [];
        }

        events[event].push(listener);

        return true;
    };

    /**
     * Remove the function previously added to be called whenever the specified event is emitted.
     */
    let off = function( event, listener )
    {
        if( Object.values(RTCEvent).indexOf(event) == -1 )
        {
            return false;
        }

        if( !(listener instanceof Function) )
        {
            return false;
        }

        if( typeof events[event] === "object" )
        {
            let index = events[event].indexOf(listener);
            if( index > -1 )
            {
                events[event].splice(index, 1);
                return true;
            }
        }

        return false;
    };

    /**
     * Emit the specified event.
     */
    let emit = function( event )
    {
        if( Object.values(RTCEvent).indexOf(event) == -1 )
        {
            return false;
        }

        let args = [].slice.call(arguments, 1);

        if( typeof events[event] === "object" )
        {
            let listeners = events[event].slice();
            for( let i = 0; i < listeners.length; i++ )
            {
                listeners[i].apply(this, args);
            }
        }

        return true;
    };

    /**
     * Get the call identified by the specified ID.
     */
    let getCall = function( callId )
    {
        return (callId in calls) ? calls[callId] : null;
    };
 
    /**
     * Get all the calls.
     */
    let getCalls = function()
    {
        return calls;
    };

    /**
     * Connect to the server.
     */
    let connect = function( url )
    {
        if( socket && socket.readyState != WebSocket.CLOSED )
        {
            console?.error("WebSocket not closed");
            return;
        }

        socket = new WebSocket(url);

        socket.onopen = onOpen;
        socket.onmessage = onMessage;
        socket.onclose = onClose;
    };

    /**
     * Disconnect from the server.
     */
    let disconnect = function()
    {
        if( !socket || socket.readyState == WebSocket.OPEN )
        {
            console?.error("WebSocket not opened");
            return;
        }

        socket?.close();
    };

    /**
     * Event handler called when the connection is opened.
     */
    let onOpen = function( event )
    {
        startKeepAlive();

        console?.log("%c" + RTCEvent.ClientConnected + "%o", settings.debugStyle, socket.url);

        emit(RTCEvent.ClientConnected, { url: socket.url });
    };

    /**
     * Event handler called when the connection is closed.
     */
    let onClose = function( event )
    {
        userId = null;
        rtcConfiguration.iceServers = null;

        stopKeepAlive();

        console?.log("%c" + RTCEvent.ClientDisconnected + "%o", settings.debugStyle, socket.url);
        emit(RTCEvent.ClientDisconnected, { url: socket.url });
    };

    /**
     * Event handler called when a message is received from the server.
     */
    let onMessage = function( msg )
    {
        let message = JSON.parse(msg.data);
        if( message.id === "pong" )
        {
            return;
        }

        console?.log(" %c%s" + "%o", settings.debugStyle, message.id, msg.data);

        // Check whether the message needs internal handling.
        switch( message.id )
        {
            case "register_response":       handleRegisterResponse(message);        break;
            case "unregister_response":     handleUnregisterResponse(message);      break;
            case "call_response":           handleCallResponse(message);            break;
            case "incoming_call":           handleIncomingCall(message);            break;
            case "call_accepted":           handleCallAccepted(message);            break;
            case "call_canceled":           handleCallCanceled(message);            break;
            case "remote_offer":            handleRemoteOffer(message);             break;
            case "remote_answer":           handleRemoteAnswer(message);            break;
            case "remote_candidate":        handleRemoteCandidate(message);         break;
            case "user_hangup":             handleUserHangup(message);              break;
        }

        // Check whether the message has a response listener.
        if( message.uuid in responses )
        {
            let response = responses[message.uuid];
            delete responses[message.uuid];
            delete message.uuid;
            response(message);
        }

        // Check whether the message has an event.
        emit(message.id, message);
    };

    /**
     * Send a message to the server.
     */
    let sendMessage = function( message, response )
    {
        if( !socket || socket.readyState !== WebSocket.OPEN )
        {
            return false;
        }

        // Generate a UUID.
        message.uuid = uuid();

        // Add the response listener.
        if( response instanceof Function )
        {
            responses[message.uuid] = response;
        }

        // Send the message.
        let msg = JSON.stringify(message);
        socket.send(msg);
        if( message.id !== "ping" )
        {
            console?.log(" %c%s" + "%o", settings.debugStyle, message.id, msg);
        }

        return true;
    };

    /**
     * Start a keep alive timeout.
     */
    let startKeepAlive = function()
    {
        if( !socket || socket.readyState !== WebSocket.OPEN )
        {
            console?.error("WebSocket not opened");
            return false;
        }

        ping();

        keepAliveTimeout = window.setTimeout(startKeepAlive, settings.pingPeriod);

        return true;
    };

    /**
     * Stop the keep alive timeout.
     */
    let stopKeepAlive = function()
    {
        window.clearTimeout(keepAliveTimeout);
    };
 
    /**
     * Send a ping to the server.
     */
    let ping = function()
    {
        let message =
        {
            id: "ping"
        };
        return sendMessage(message);
    };

    /**
     * Register to the server.
     */
    let register = function( username, response )
    {
        if( userId )
        {
            console?.error("Client already registered");
            return false;
        }

        let message =
        {
            id: "register",
            userId: username
        };
        return sendMessage(message, response);
    };

    /**
     * Unregister from the server.
     */
    let unregister = function( response )
    {
        if( !userId )
        {
            console?.error("Client not registered");
            return false;
        }

        hangup();

        let message =
        {
            id: "unregister",
            userId: userId
        };
        return sendMessage(message, response);
    };

    /**
     * Call a user.
     */
    let call = function( calleeId, response )
    {
        if( userId === calleeId )
        {
            console?.error("Invalid user id " + calleeId);
            return false;
        }

        let message =
        {
            id: "call",
            callerId: userId,
            calleeId: calleeId
        };
        return sendMessage(message, response);
    };

    /**
     * Close a call.
     */
    let closeCall = function( callId )
    {
        if( !(callId in calls) )
        {
            return false;
        }

        let call = calls[callId];
        call.close();
        delete(calls[callId]);

        emit(RTCEvent.CallClosed, { call: call });

        return true;
    };

    /**
     * Accept a call.
     */
    let acceptCall = function( callId, response )
    {
        if( !(callId in calls) )
        {
            console?.error("Call " + callId + " not found");
            return false;
        }

        let call = calls[callId];

        let message =
        {
            id: "accept_call",
            callId: call.callId,
            callerId: call.callerId,
            calleeId: call.calleeId
        };
        return sendMessage(message, response);
    };

    /**
     * Cancel a call.
     */
    let cancelCall = function( callId, response )
    {
        if( !(callId in calls) )
        {
            console?.error("Call " + callId + " not found");
            return false;
        }

        // Delete the call.
        let call = calls[callId];
        delete calls[callId];

        let message =
        {
            id: "cancel_call",
            callId: call.callId,
            callerId: call.callerId,
            calleeId: call.calleeId
        };
        return sendMessage(message, response);
    };

    /**
     * Hang up a call. If call ID is undefined then all calls are hang up.
     */
    let hangup = function( callId, response )
    {
        if( callId ) // Close the call.
        {
            if( !closeCall(callId) )
            {
                return false;
            }

            let message =
            {
                id: "hangup",
                callId: callId
            };
            return sendMessage(message, response);
        }
        else // Close all the calls.
        {
            for( let callId in calls )
            {
                if( !closeCall(callId) )
                {
                    continue;
                }

                let message =
                {
                    id: "hangup",
                    callId: callId
                };
                sendMessage(message);
            }

            calls = { };

            return true;
        }
    };

    /**
     * Generate a universally unique identifier.
     * Reference: RFC 4122 https://www.ietf.org/rfc/rfc4122.txt
     */
    let uuid = function()
    {
        return uuidv4();
    };
 
    /**
     * Generate a universally unique identifier v4.
     * Reference: https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
     */
    let uuidv4 = function()
    {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };
//#endregion

//#region EventHandlers
    /**
     * Register response event handler.
     */
    let handleRegisterResponse = function( event )
    {
        if( event.status === "ok" )
        {
            userId = event.userId;
            rtcConfiguration.iceServers = JSON.parse(event.iceServers);
        }
    };

    /**
     * Unregister response event handler.
     */
    let handleUnregisterResponse = function( event )
    {
        if( event.status === "ok" )
        {
            userId = null;
            rtcConfiguration.iceServers = null;
        }
    };

    /**
     * Call response event handler.
     */
    let handleCallResponse = function( event )
    {
        if( event.status === "ok" )
        {
            // Create the call.
            let call = new RTCCall(event.callId, event.callerId, event.calleeId);
            calls[call.callId] = call;
        }
    };

    /**
     * Incoming call event handler.
     */
    let handleIncomingCall = function( event )
    {
        // Create the call.
        let call = new RTCCall(event.callId, event.callerId, event.calleeId);
        calls[event.callId] = call;
    };

    /**
     * Call accepted event handler.
     */
    let handleCallAccepted = function( event )
    {
        // Create the peer connection.
        let peerConnection = new RTCPeerConnection(rtcConfiguration);
        let call = calls[event.callId];
        call.bind(peerConnection, true);

        // Handle the peer connection lifecycle.
        peerConnection.oniceconnectionstatechange = function( other )
        {
            handleIceConnectionStateChange(call);
        }

        // Generate candidates.
        peerConnection.onicecandidate = function( other )
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

        peerConnection.onnegotiationneeded = function( other )
        {
            // Generate offer.
            peerConnection.createOffer().then(function( sdp )
            {
                // Set caller local description.
                peerConnection.setLocalDescription(sdp);

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
        let tracks = settings.defaultStream.getTracks();
        tracks.forEach(track => peerConnection.addTrack(track));

        // Create a default data channel to avoid renegotiation.
        peerConnection.createDataChannel("default");
    };

    /**
     * Call canceled event handler.
     */
    let handleCallCanceled = function( event )
    {
        closeCall(event.callId);
    };

    /**
     * Remote offer event handler.
     */
    let handleRemoteOffer = function( event )
    {
        // Create the peer connection.
        let peerConnection = new RTCPeerConnection(rtcConfiguration);
        let call = calls[event.callId];
        call.bind(peerConnection, false);

        // Handle the peer connection lifecycle.
        peerConnection.oniceconnectionstatechange = function( other )
        {
            handleIceConnectionStateChange(call);
        }

        // Set the callee remote description.
        peerConnection.setRemoteDescription(JSON.parse(event.offer));

        // Gather the pending candidates.
        call.gatherPendingCandidates();

        // Generate the candidates.
        peerConnection.onicecandidate = function( other )
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
        let tracks = settings.defaultStream.getTracks();
        tracks.forEach(track => peerConnection.addTrack(track));

        // Create the answer.
        window.setTimeout(function()
        {
            peerConnection.createAnswer().then(function( sdp )
            {
                // Set the callee local description.
                peerConnection.setLocalDescription(sdp);

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
     */
    let handleRemoteAnswer = function( event )
    {
        if( event.callId in calls )
        {
            let answer = JSON.parse(event.answer);

            // Set the caller remote description.
            calls[event.callId].setRemoteDescription(answer);
        }
    };

    /**
     * Remote candidate event handler.
     */
    let handleRemoteCandidate = function( event )
    {
        let candidate = JSON.parse(event.candidate);
        if( !candidate || !candidate.candidate || candidate.candidate === "" ) // Empty if the RTCIceCandidate is an "end of candidates" indicator.
        {
            return;
        }

        if( event.callId in calls )
        {
            let call = calls[event.callId];
            call.addCandidate(candidate);
        }
    };

    /**
     * User hangup event handler.
     */
    let handleUserHangup = function( event )
    {
        closeCall(event.callId);
    };

    /**
     * ICE connection state change event handler.
     */
    let handleIceConnectionStateChange = async function( call )
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
                console?.log("%c" + RTCEvent.CallOpened + "%o%o", settings.debugStyle, call.callId, stream);
                emit(RTCEvent.CallOpened, { call: call, stream: stream });
                break;
            }
        }
    };
//#endregion

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
}

export function RTCCall( callId, callerId, calleeId )
{
//#region Variables
    let connection = null;
    let candidates = [];
    let channels = { };
    let initiator = false;
//#endregion

//#region Methods
    /**
     * Bind the call to a peer connection.
     */
    let bind = function( peerConnection, isInitiator )
    {
        if( !(peerConnection instanceof RTCPeerConnection) )
        {
            return false;
        }

        connection = peerConnection;
        initiator = isInitiator;

        // Handle the data channel event internally to track the data channels lifecycle.
        connection.addEventListener("datachannel", function( event )
        {
            channels[event.channel.label] = event.channel;

            // Handle the close event.
            event.channel.addEventListener("onclose", function( event )
            {
                delete channels[event.channel.label];
            });
        });

        return true;
    };

    /**
     * Close the call.
     */
    let close = function()
    {
        connection?.close();
    };

    /**
     * Return whether the user is the initiator.
     */
    let isInitiator = function()
    {
        return initiator;
    };

    /**
     * Get the call state.
     */
    let getState = function()
    {
        return (connection) ? connection.iceConnectionState : "closed";
    };

    /**
     * Get the call stats.
     */
    let getStats = async function()
    {
        if( !connection )
        {
            return;
        }

        let callStats = { callId: callId, callerId: callerId, calleeId: calleeId };

        return await connection.getStats(null).then(function( stats )
        {
            // Get the stats of the succeeded candidate pair.
            let pairStats = null;
            stats.forEach(report =>
            {
                //console.log(report);
                if( report.type === "candidate-pair" && (report.selected === true || report.state === "succeeded") )
                {
                    pairStats = report;
                }
            });

            // Get the stats of the local and remote candidates.
            if( pairStats )
            {
                stats.forEach(report =>
                {
                    if( report.id === pairStats.localCandidateId )
                    {
                        callStats.localType = report.candidateType;
                        callStats.localAddress = report.address ?? report.ip;
                        callStats.localPort = report.port;
                        callStats.localProtocol = report.protocol;
                    }
                    if( report.id === pairStats.remoteCandidateId )
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
     */
    let addCandidate = function( candidate )
    {
        if( !connection )
        {
            candidates.push(candidate);
        }
        else
        {
            connection.addIceCandidate(candidate);
        }
    };

    /**
     * Gather the pending candidates.
     */
    let gatherPendingCandidates = function()
    {
        if( candidates.length > 0 )
        {
            candidates.forEach(candidate => connection.addIceCandidate(candidate));
            candidates = [];
        }
    };

    /**
     * Set the remote session description.
     */
    let setRemoteDescription = function( description )
    {
        if( !connection )
        {
            return false;
        }

        connection.setRemoteDescription(description);

        return true;
    };

    /**
     * [NYI] Set the stream's bandwidth.
     * References:
     * https://webrtchacks.com/limit-webrtc-bandwidth-sdp/
     * https://stackoverflow.com/questions/57653899/how-to-increase-the-bitrate-of-webrtc
     */
    let setBandwidth = function( bandwidth )
    {
        if( !connection )
        {
            return false;
        }

        let senders = connection.getSenders();
        if( !senders )
        {
            return false;
        }

        for( let i = 0; i < senders.length; i++ )
        {
            let sender = senders[i];
            let parameters = sender.getParameters();
            if( !parameters.encodings )
            {
                parameters.encodings = [{ }];
            }

            parameters.encodings[0].maxBitrate = bandwidth * 1000;

            sender.setParameters(parameters);
        }

        return true;
    };

    /**
     * Get the remote audio track specified by index.
     */
    let getRemoteAudioTrack = function ( index = 0 )
    {
        if( !connection )
        {
            return null;
        }

        let receivers = connection.getReceivers();
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
     */
    let getRemoteVideoTrack = function ( index = 0 )
    {
        if( !connection )
        {
            return null;
        }

        let receivers = connection.getReceivers();
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
     */
    let getRemoteStream = function()
    {
        if( !connection )
        {
            return null;
        }

        let receivers = connection.getReceivers();
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
     */
    let replaceLocalAudioTrack = function( track, index = 0 )
    {
        if( !connection || !track )
        {
            return false;
        }

        let audioSenders = [];
        let senders = connection.getSenders();
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
     */
    let replaceLocalVideoTrack = function( track, index = 0 )
    {
        if( !connection || !track )
        {
            return false;
        }

        let videoSenders = [];
        let senders = connection.getSenders();
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

//#region DataChannel
    /**
     * Open a data channel.
     */
    let openChannel = function( label )
    {
        if( !connection || label in channels )
        {
            return false;
        }

        let channel = connection.createDataChannel(label);
        channels[label] = channel;

        // Handle the close event.
        channel.addEventListener("onclose", function( event )
        {
            delete channels[channel.label];
        });

        return true;
    };

    /**
     * Close a data channel.
     */
    let closeChannel = function( label )
    {
        if( !connection || !(label in channels) )
        {
            return false;
        }

        let channel = channels[label];
        channel.close();
        delete channels[label];

        return true;
    };

    /**
     * Set a callback for the data channel event.
     */
    let onDataChannel = function( callback )
    {
        if( !connection )
        {
            return false;
        }

        connection.addEventListener("datachannel", callback);

        return true;
    };

    /**
     * Set a callback to a data channel open event.
     */
    let onChannelOpen = function( label, callback )
    {
        if( !connection || !(label in channels) || !(callback instanceof Function) )
        {
            return false;
        }

        let channel = channels[label];
        channel.onopen = callback;

        return true;
    };

    /**
     * Set a callback to a data channel close event.
     */
    let onChannelClose = function( label, callback )
    {
        if( !connection || !(label in channels) || !(callback instanceof Function) )
        {
            return false;
        }

        let channel = channels[label];
        channel.addEventListener("onclose", callback);

        return true;
    };

    /**
     * Set a callback to a data channel error event.
     */
    let onChannelError = function( label, callback )
    {
        if( !connection || !(label in channels) || !(callback instanceof Function) )
        {
            return false;
        }

        let channel = channels[label];
        channel.onerror = callback;

        return true;
    };

    /**
     * Set a callback to a data channel message event.
     */
    let onChannelMessage = function( label, callback )
    {
        if( !connection || !(label in channels) || !(callback instanceof Function) )
        {
            return false;
        }

        let channel = channels[label];
        channel.onmessage = callback;

        return true;
    };

    /**
     * Send data through an opened channel.
     */
    let sendData = function( label, data )
    {
        if( !connection || !(label in channels) )
        {
            return false;
        }

        let channel = channels[label];
        if( channel.readyState !== "open" )
        {
            return false;
        }

        channel.send(data);

        return true;
    };
//#endregion

    return {
        get callId() { return callId; },
        get callerId() { return callerId; },
        get calleeId() { return calleeId; },
        bind,
        close,
        isInitiator,
        getState,
        getStats,
        addCandidate,
        gatherPendingCandidates,
        setRemoteDescription,
        setBandwidth,
        getRemoteAudioTrack,
        getRemoteVideoTrack,
        getRemoteStream,
        replaceLocalAudioTrack,
        replaceLocalVideoTrack,
        openChannel,
        closeChannel,
        onDataChannel,
        onChannelOpen,
        onChannelClose,
        onChannelError,
        onChannelMessage,
        sendData
    };
}