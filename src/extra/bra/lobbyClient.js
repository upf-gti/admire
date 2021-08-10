export function LobbyClient( settings )
{
//#region PRIVATE

    let _defaultSettings =
    {
        // Debug messages to console?
        debug: false,

        // Style used to debug messages.
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(180, 89%, 45%, 1)",

        // Period to send ping messages in ms.
        pingPeriod: 5 * 1000
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign(_defaultSettings, settings);

    let console = (settings.debug) ? window.console : null;

    let _events = { };
    let _token = null;
    let _socket = null;
    let _keepAliveTimeout = null;

    let _userId = null;
    let _roomId = null;
    let _channels = { };

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

        console?.log("%cclient_connected%o", settings.debugStyle, _socket.url);

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

            console?.log("%c%s%o", settings.debugStyle, message.id, msg.data);

            if( HANDLERS[message.id] instanceof Function )
            {
                HANDLERS[message.id](message);
            }

            emit(message.id, message);
        }
        else
        {
            console?.log("%cunknown_message%o", settings.debugStyle, msg.data);
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
            console?.log(" %c%s%o", settings.debugStyle, message.id, msg);
        }

        _socket.send(msg);
    };

    /**
     * Event handler called when the connection is closed.
     * @param {EventListener} event - The dispatched event.
     */
    let onClose = function( event )
    {
        // Stop the keep alive routine.
        window.clearTimeout(_keepAliveTimeout);

        console?.log("%cclient_disconnected%o", settings.debugStyle, _socket.url);

        emit("client_disconnected", { url: _socket.url });
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
     * Login to the server.
     * @param {String} token - The authentication token.
     */
    let login = function( token )
    {
        _token = token;

        let message = { id: "login", token: _token };
        sendMessage(message);
    };

    /**
     * Logout from the server.
     */
    let logout = function()
    {
        let message = { id: "logout", token: _token };
        sendMessage(message);
    };

    /**
     * Get the current room information.
     */
    let getRoom = function()
    {
        let message = { id: "get_room", token: _token };
        sendMessage(message);
    };

    /**
     * Get the list of room informations.
     */
    let getRooms = function()
    {
        let message = { id: "get_rooms", token: _token };
        sendMessage(message);
    };

    /**
     * Create a room.
     * @param {String} roomId - The room ID.
     */
    let createRoom = function( roomId )
    {
        if( !validateId(roomId) )
        {
            return false;
        }

        let message = { id: "create_room", token: _token, roomId: roomId };
        sendMessage(message);

        return true;
    };

    /**
     * Join a room.
     * @param {String} roomId - The room ID.
     */
    let joinRoom = function( roomId )
    {
        let message = { id: "join_room", token: _token, roomId: roomId };
        sendMessage(message);
    };

    /**
     * Leave the room.
     */
    let leaveRoom = function()
    {
        let message = { id: "leave_room", token: _token };
        sendMessage(message);
    };

    /**
     * Enable a user to the channel.
     * @param {String} channelId - The channel ID.
     */
    let enableChannel = function( userId, channelId )
    {
        let message = { id: "enable_channel", token: _token, userId: userId, channelId: channelId };
        sendMessage(message);
    };

    /**
     * Disable a user from the channel.
     * @param {String} channelId - The channel ID.
     */
    let disableChannel = function( userId, channelId )
    {
        let message = { id: "disable_channel", token: _token, userId: userId, channelId: channelId };
        sendMessage(message);
    };

    /**
     * Join a channel.
     * @param {String} channelId - The channel ID.
     */
    let joinChannel = function( channelId )
    {
        let message = { id: "join_channel", token: _token, channelId: channelId };
        sendMessage(message);
    };

    /**
     * Leave a channel.
     * @param {String} channelId - The channel ID.
     */
    let leaveChannel = function( channelId )
    {
        let message = { id: "leave_channel", token: _token, channelId: channelId };
        sendMessage(message);
    };

    /**
     * Forward a message to other user.
     * @param {String} userId - The user ID.
     * @param {Object} msg - The message to forward.
     */
    let forwardMessage = function( userId, msg )
    {
        if( _userId === userId )
        {
            return;
        }

        let message = { id: "forward_message", token: _token, userId: userId, msg: msg };
        sendMessage(message);
    };

    /**
     * Returns whether or not the client is disconnected.
     * @returns Whether or not the client is disconnected.
     */
    let isDisconnected = function()
    {
        return !_socket || _socket.readyState === "3"; // Closed.
    };

    /**
     * Returns whether or not the user is logged in this client.
     * @param {String} userId - The user ID.
     * @return Whether or not the user is logged in this client.
     */
    let isLogged = function( userId )
    {
        if( _userId )
        {
            return _userId === userId;
        }

        return false;
    };

    /**
     * Returns whether or not the user is joined to the channel.
     * @param {String} channelId - The channel ID.
     * @return Whether or not the user is joined to the channel.
     */
    let isInChannel = function( channelId )
    {
        return channelId in _channels;
    };

    /**
     * Validates the specified ID following a regular expression.
     * @param {String} str - The ID to validate.
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
     * Login response event handler.
     * @param {Object} event - The event object.
     */
    let onLoginResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _userId = event.userId;
        }
    };

    /**
     * Logout response event handler.
     * @param {Object} event - The event object.
     */
    let onLogoutResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _token = null;
            _userId = null;
            _roomId = null;
            _channels = { };
        }
    };

    /**
     * Create room response event handler.
     * @param {Object} event - The event object.
     */
    let onCreateRoomResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _roomId = event.roomId;
        }
    };

    /**
     * Join room response event handler.
     * @param {Object} event - The event object.
     */
    let onJoinRoomResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _roomId = event.roomId;
        }
    };

    /**
     * Leave room response event handler.
     * @param {Object} event - The event object.
     */
    let onLeaveRoomResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _roomId = null;
            _channels = { };
        }
    };

    /**
     * Channel disabled event handler.
     * @param {Object} event - The event object.
     */
    let onChannelDisabled = function( event )
    {
        if( event.userId !== _userId )
        {
            return;
        }

        if( event.channelId in _channels )
        {
            delete _channels[event.channelId];
        }
    };

    /**
     * Join channel response event handler.
     * @param {Object} event - The event object.
     */
    let onJoinChannelResponse = function( event )
    {
        if( event.status === "ok" )
        {
            _channels[event.channelId] = true;
        }
    };

    /**
     * Leave channel response event handler.
     * @param {Object} event - The event object.
     */
    let onLeaveChannelResponse = function( event )
    {
        if( event.status === "ok" )
        {
            delete _channels[event.channelId];
        }
    };

    /**
     * Handlers used to listen messages from the server.
     *      function - The message is valid, emitted and handled.
     *      true - The message is valid, emitted and not handled.
     *      false - The message is valid, not emitted and not handled.
     *      undefined - The message is not valid.
     */
    const HANDLERS =
    {
        "pong":                         false,
        "login_response":               onLoginResponse,
        "logout_response":              onLogoutResponse,
        "get_room_response":            true,
        "get_rooms_response":           true,
        "create_room_response":         onCreateRoomResponse,
        "room_created":                 true,
        "join_room_response":           onJoinRoomResponse,
        "guest_joined_room":            true,
        "user_joined_room":             true,
        "leave_room_response":          onLeaveRoomResponse,
        "master_left_room":             true,
        "guest_left_room":              true,
        "user_left_room":               true,
        "room_deleted":                 true,
        "enable_channel_response":      true,
        "channel_enabled":              true,
        "disable_channel_response":     true,
        "channel_disabled":             onChannelDisabled,
        "join_channel_response":        onJoinChannelResponse,
        "user_joined_channel":          true,
        "leave_channel_response":       onLeaveChannelResponse,
        "user_left_channel":            true,
        "forward_message_response":     true,
        "remote_message":               true
    };

//#endregion

//#region PUBLIC

    return {
        on,
        off,
        connect,
        disconnect,
        login,
        logout,
        getRoom,
        getRooms,
        createRoom,
        joinRoom,
        leaveRoom,
        enableChannel,
        disableChannel,
        joinChannel,
        leaveChannel,
        forwardMessage,
        isDisconnected,
        isLogged,
        isInChannel
    };

//#endregion
}
