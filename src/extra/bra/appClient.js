"use strict";

function AppClient( settings )
{
//#region PRIVATE

    var defaults =
    {
        // Debug messages to console?
        debug: false,

        // Style used to debug messages.
        debugStyle: "background: hsla(0, 0%, 13%, 1); color: hsla(180, 89%, 45%, 1)",

        // Period to send ping messages in ms.
        pingPeriod: 5 * 1000
    };

    settings = (typeof settings !== "object") ? { } : settings;
    settings = Object.assign(defaults, settings);

    var console = (settings.debug) ? window.console : undefined;
    var events = { };
    var socket = undefined;
    var keepAliveTimeout = undefined;

    var token = undefined;
    var userId = undefined;
    var userType = undefined;
    var roomId = undefined;
    var channels = { };

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
     * Event handler called when the connection is opened.
     * @param {EventListener} event - The dispatched event.
     */
    var onOpen = function( event )
    {
        // Start the keep alive routine.
        keepAlive();

        // Try to get the token.
        let token = window.sessionStorage.getItem("token") ?? window.localStorage.getItem("token");
        if( token )
        {
            window.sessionStorage.setItem("token", token);
        }

        token = token;

        emit("client_connected");
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

            console?.log(" %c%s" + "%o", settings.debugStyle, message.id, msg.data);

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
            console?.log(" %c%s" + "%o", settings.debugStyle, message.id, msg);
        }

        socket.send(msg);
    }

    /**
     * Event handler called when the connection is closed.
     * @param {EventListener} event - The dispatched event.
     */
    var onClose = function( event )
    {
        // Stop the keep alive routine.
        window.clearTimeout(keepAliveTimeout);

        delete this.socket;

        emit("client_disconnected");
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
     * Login to the server.
     * @param {String} userId - The user id.
     * @param {String} password - The password.
     */
    var login = function( userId, password )
    {
        let message = { id: "login", userId: userId, password: password };
        sendMessage(message);
    }

    /**
     * Logout from the server.
     */
    var logout = function()
    {
        let message = { id: "logout", token: token };
        sendMessage(message);
    }

    /**
     * Autologin to the server.
     */
    var autologin = function()
    {
        let message = { id: "autologin", token: token };
        sendMessage(message);
    }

    /**
     * Get the current room information.
     */
    var getRoom = function()
    {
        let message = { id: "get_room", token: token };
        sendMessage(message);
    }

    /**
     * Get the list of room informations.
     */
    var getRooms = function()
    {
        let message = { id: "get_rooms", token: token };
        sendMessage(message);
    }

    /**
     * Create a room.
     * @param {String} roomId - The room id.
     */
    var createRoom = function( roomId )
    {
        if( !validateString(roomId) )
        {
            return false;
        }

        let message = { id: "create_room", token: token, roomId: roomId };
        sendMessage(message);

        return true;
    }

    /**
     * Join a room.
     * @param {String} roomId - The room id.
     */
    var joinRoom = function( roomId )
    {
        let message = { id: "join_room", token: token, roomId: roomId };
        sendMessage(message);
    }

    /**
     * Leave the room.
     */
    var leaveRoom = function()
    {
        let message = { id: "leave_room", token: token };
        sendMessage(message);
    }

    /**
     * Enable a user to the channel.
     * @param {String} channelId - The channel id.
     */
    var enableChannel = function( userId, channelId )
    {
        let message = { id: "enable_channel", token: token, userId: userId, channelId: channelId };
        sendMessage(message);
    }

    /**
     * Disable a user from the channel.
     * @param {String} channelId - The channel id.
     */
    var disableChannel = function( userId, channelId )
    {
        let message = { id: "disable_channel", token: token, userId: userId, channelId: channelId };
        sendMessage(message);
    }

    /**
     * Join a channel.
     * @param {String} channelId - The channel id.
     */
    var joinChannel = function( channelId )
    {
        let message = { id: "join_channel", token: token, channelId: channelId };
        sendMessage(message);
    }

    /**
     * Leave a channel.
     * @param {String} channelId - The channel id.
     */
    var leaveChannel = function( channelId )
    {
        let message = { id: "leave_channel", token: token, channelId: channelId };
        sendMessage(message);
    }

    /**
     * Forward a message to other user.
     * @param {String} userId - The user id.
     * @param {Object} msg - The message to forward.
     */
    var forwardMessage = function( userId, msg )
    {
        if( this.userId === userId )
        {
            return;
        }

        let message = { id: "forward_message", token: token, userId: userId, msg: msg };
        sendMessage(message);
    }

    /**
     * Returns whether or not the client is disconnected.
     * @returns Whether or not the client is disconnected.
     */
    var isDisconnected = function()
    {
        return !socket || socket.readyState === "3"; // Closed.
    }

    /**
     * Returns whether or not the user is logged in this client.
     * @param {String} userId - The user id.
     * @return Whether or not the user is logged in this client.
     */
    var isLogged = function( userId )
    {
        if( this.userId )
        {
            return this.userId === userId;
        }

        return false;
    }

    /**
     * Returns whether or not the user is joined to the channel.
     * @param {String} channelId - The channel id.
     * @return Whether or not the user is joined to the channel.
     */
    var isInChannel = function( channelId )
    {
        return channelId in channels;
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
     * Login response event handler.
     * @param {Object} event - The event object.
     */
    var onLoginResponse = function( event )
    {
        if( event.status === "ok" )
        {
            token = event.token;
            userId = event.userId;
            userType = event.userType;

            window.sessionStorage.setItem("token", token);
            window.localStorage.setItem("token", token);
        }
    }

    /**
     * Logout response event handler.
     * @param {Object} event - The event object.
     */
    var onLogoutResponse = function( event )
    {
        if( event.status === "ok" )
        {
            token = undefined;
            userId = undefined;
            userType = undefined;
            roomId = undefined;
            channels = { };

            window.sessionStorage.removeItem("token");
            window.localStorage.removeItem("token");
        }
    }

    /**
     * Autologin response event handler.
     * @param {Object} event - The event object.
     */
    var onAutoLoginResponse = function( event )
    {
        if( event.status === "ok" )
        {
            userId = event.userId;
            userType = event.userType;
            if( event.roomInfo )
            {
                roomId = event.roomInfo.id;
            }
        }

        if( event.status === "error" )
        {
            token = undefined;
        }
    }

    /**
     * Create room response event handler.
     * @param {Object} event - The event object.
     */
    var onCreateRoomResponse = function( event )
    {
        if( event.status === "ok" )
        {
            roomId = event.roomId;
        }
    }

    /**
     * Join room response event handler.
     * @param {Object} event - The event object.
     */
    var onJoinRoomResponse = function( event )
    {
        if( event.status === "ok" )
        {
            roomId = event.roomId;
        }
    }

    /**
     * Leave room response event handler.
     * @param {Object} event - The event object.
     */
    var onLeaveRoomResponse = function( event )
    {
        if( event.status === "ok" )
        {
            roomId = undefined;
            channels = { };
        }
    }

    /**
     * Channel disabled event handler.
     * @param {Object} event - The event object.
     */
    var onChannelDisabled = function( event )
    {
        if( event.userId !== userId )
        {
            return;
        }

        if( event.channelId in channels )
        {
            delete channels[event.channelId];
        }
    }

    /**
     * Join channel response event handler.
     * @param {Object} event - The event object.
     */
    var onJoinChannelResponse = function( event )
    {
        if( event.status === "ok" )
        {
            channels[event.channelId] = true;
        }
    }

    /**
     * Leave channel response event handler.
     * @param {Object} event - The event object.
     */
    var onLeaveChannelResponse = function( event )
    {
        if( event.status === "ok" )
        {
            delete channels[event.channelId];
        }
    }

    /**
     * Handlers used to listen messages from the server.
     *      function - The message is valid, emitted and handled.
     *      true - The message is valid, emitted and not handled.
     *      false - The message is valid, not emitted and not handled.
     *      undefined - The message is not valid.
     */
    const HANDLERS =
    {
        "pong": false,
        "login_response": onLoginResponse,
        "logout_response": onLogoutResponse,
        "autologin_response": onAutoLoginResponse,
        "get_room_response": true,
        "get_rooms_response": true,
        "create_room_response": onCreateRoomResponse,
        "join_room_response": onJoinRoomResponse,
        "guest_joined_room": true,
        "leave_room_response": onLeaveRoomResponse,
        "master_left_room": true,
        "guest_left_room": true,
        "enable_channel_response": true,
        "channel_enabled": true,
        "disable_channel_response": true,
        "channel_disabled": onChannelDisabled,
        "join_channel_response": onJoinChannelResponse,
        "user_joined_channel": true,
        "leave_channel_response": onLeaveChannelResponse,
        "user_left_channel": true,
        "forward_message_response": true,
        "remote_message": true
    };

//#endregion

//#region PUBLIC

    return {
        on: on,
        off: off,
        connect: connect,
        disconnect: disconnect,
        login: login,
        logout: logout,
        autologin: autologin,
        getRoom: getRoom,
        getRooms: getRooms,
        createRoom: createRoom,
        joinRoom: joinRoom,
        leaveRoom: leaveRoom,
        enableChannel: enableChannel,
        disableChannel: disableChannel,
        joinChannel: joinChannel,
        leaveChannel: leaveChannel,
        forwardMessage: forwardMessage,
        isDisconnected: isDisconnected,
        isLogged: isLogged,
        isInChannel: isInChannel
    };

//#endregion
}

export { AppClient };