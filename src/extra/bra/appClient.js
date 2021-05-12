function AppClient()
{
    // Debug messages to console?
    this.DEBUG = true;
    this.debugStyle = "background: rgb(34, 34, 34); color: rgb(13, 217, 217)";

    this.token = undefined;
    this.userId = undefined;
    this.userType = undefined;
    this.roomId = undefined;
    this.channels = { };

    this.ws = undefined;
    this.events = { };

    /**
     * Handlers used to listen messages from the server.
     *      function - The message is valid, emitted and handled.
     *      true - The message is valid, emitted and not handled.
     *      false - The message is valid, not emitted and not handled.
     *      undefined - The message is not valid.
     */
    this.messages =
    {
        "login_response": this.onLoginResponse.bind(this),
        "logout_response": this.onLogoutResponse.bind(this),
        "autologin_response": this.onAutoLoginResponse.bind(this),
        "get_room_response": true,
        "get_rooms_response": true,
        "create_room_response": this.onCreateRoomResponse.bind(this),
        "join_room_response": this.onJoinRoomResponse.bind(this),
        "guest_joined_room": true,
        "leave_room_response": this.onLeaveRoomResponse.bind(this),
        "master_left_room": true,
        "guest_left_room": true,
        "enable_channel_response": true,
        "channel_enabled": true,
        "disable_channel_response": true,
        "channel_disabled": this.onChannelDisabled.bind(this),
        "join_channel_response": this.onJoinChannelResponse.bind(this),
        "user_joined_channel": true,
        "leave_channel_response": this.onLeaveChannelResponse.bind(this),
        "user_left_channel": true,
        "forward_message_response": true,
        "remote_message": true
    };
}

/**
 * Connect to the server.
 * @param {String} url - The URL of the server.
 */
AppClient.prototype.connect = function( url )
{
    this.openWebSocket(url);
}

/**
 * Disconnect from the server.
 */
AppClient.prototype.disconnect = function()
{
    this.closeWebSocket();
}

/**
 * Open the web socket connection.
 * @param {String} url - The URL of the server.
 */
AppClient.prototype.openWebSocket = function( url )
{
    this.ws = new WebSocket(url);

    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onclose = this.onClose.bind(this);
}

/**
 * Close the web socket connection.
 */
AppClient.prototype.closeWebSocket = function()
{
    if( this.ws )
    {
        this.ws.close();
    }
}

/**
 * Event handler called when the connection is opened.
 * @param {EventListener} event - The dispatched event.
 */
AppClient.prototype.onOpen = function( event )
{
    // Try to get the token.
    let token = sessionStorage.getItem("token") ?? localStorage.getItem("token");
    if(token)
    {
        sessionStorage.setItem("token", token);
    }

    this.token = token;

    this.emit("client_connected");
}

/**
 * Event handler called when a message is received from the server.
 * @param {EventListener} msg - The message received.
 */
AppClient.prototype.onMessage = function( msg )
{
    let message = JSON.parse(msg.data);

    // Check the message.
    if( message.id in this.messages )
    {
        if( this.messages[message.id] === false )
        {
            return;
        }

        if( this.DEBUG ) console.log(" %c%s%o", this.debugStyle, message.id, msg.data);

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
AppClient.prototype.sendMessage = function( message )
{
    let msg = JSON.stringify(message);
    if( this.DEBUG ) console.log(" %c%s%o", this.debugStyle, message.id, msg);
    if(!this.ws)
        return console.error('ws is null');
    this.ws.send(msg);
}

/**
 * Event handler called when the connection is closed.
 * @param {EventListener} event - The dispatched event.
 */
AppClient.prototype.onClose = function( event )
{
    this.emit("client_disconnected");
}

/**
 * Add a function that will be called whenever the specified event is emitted.
 * @param {String} event - The event name.
 * @param {Function} listener - The function to add.
 */
AppClient.prototype.on = function( event, listener )
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
AppClient.prototype.off = function( event, listener )
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
AppClient.prototype.emit = function( event )
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
 * Login to the server.
 * @param {String} userId - The user id.
 * @param {String} password - The password.
 */
AppClient.prototype.login = function( userId, password )
{
    let message = { id: "login", userId: userId, password: password };
    this.sendMessage(message);
}

/**
 * Logout from the server.
 */
AppClient.prototype.logout = function()
{
    let message = { id: "logout", token: this.token };
    this.sendMessage(message);
}

/**
 * Autologin to the server.
 */
AppClient.prototype.autologin = function()
{
    let message = { id: "autologin", token: this.token };
    this.sendMessage(message);
}

/**
 * Get the current room information.
 */
AppClient.prototype.getRoom = function()
{
    let message = { id: "get_room", token: this.token };
    this.sendMessage(message);
}

/**
 * Get the list of room informations.
 */
AppClient.prototype.getRooms = function()
{
    let message = { id: "get_rooms", token: this.token };
    this.sendMessage(message);
}

/**
 * Create a room.
 * @param {String} roomId - The room id.
 */
AppClient.prototype.createRoom = function( roomId )
{
    if( !AppClient.validateString(roomId) )
    {
        return false;
    }

    let message = { id: "create_room", token: this.token, roomId: roomId };
    this.sendMessage(message);

    return true;
}

/**
 * Join a room.
 * @param {String} roomId - The room id.
 */
AppClient.prototype.joinRoom = function( roomId )
{
    let message = { id: "join_room", token: this.token, roomId: roomId };
    this.sendMessage(message);
}

/**
 * Leave the room.
 */
AppClient.prototype.leaveRoom = function()
{
    let message = { id: "leave_room", token: this.token };
    this.sendMessage(message);
}

/**
 * Enable a user to the channel.
 * @param {String} channelId - The channel id.
 */
AppClient.prototype.enableChannel = function( userId, channelId )
{
    let message = { id: "enable_channel", token: this.token, userId: userId, channelId: channelId };
    this.sendMessage(message);
}

/**
 * Disable a user from the channel.
 * @param {String} channelId - The channel id.
 */
AppClient.prototype.disableChannel = function( userId, channelId )
{
    let message = { id: "disable_channel", token: this.token, userId: userId, channelId: channelId };
    this.sendMessage(message);
}

/**
 * Join a channel.
 * @param {String} channelId - The channel id.
 */
AppClient.prototype.joinChannel = function( channelId )
{
    let message = { id: "join_channel", token: this.token, channelId: channelId };
    this.sendMessage(message);
}

/**
 * Leave a channel.
 * @param {String} channelId - The channel id.
 */
AppClient.prototype.leaveChannel = function( channelId )
{
    let message = { id: "leave_channel", token: this.token, channelId: channelId };
    this.sendMessage(message);
}

/**
 * Forward a message to other user.
 * @param {String} userId - The user id.
 * @param {Object} msg - The message to forward.
 */
AppClient.prototype.forwardMessage = function( userId, msg )
{
    if( userId === this.userId )
    {
        return;
    }

    let message = { id: "forward_message", token: this.token, userId: userId, msg: msg };
    this.sendMessage(message);
}

/**
 * Login response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onLoginResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.token = event.token;
        this.userId = event.userId;
        this.userType = event.userType;

        window.localStorage.setItem("token", this.token);
        window.sessionStorage.setItem("token", this.token);
    }
}

/**
 * Logout response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onLogoutResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.token = undefined;
        this.userId = undefined;
        this.userType = undefined;
        this.roomId = undefined;
        this.channels = { };

        window.localStorage.removeItem("token");
        window.sessionStorage.removeItem("token");

    }
}

/**
 * Autologin response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onAutoLoginResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.userId = event.userId;
        this.userType = event.userType;
        if( event.roomInfo )
        {
            this.roomId = event.roomInfo.id;
        }
    }

    if( event.status === "error" )
    {
        this.token = undefined;
    }
}

/**
 * Create room response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onCreateRoomResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.roomId = event.roomId;
    }
}

/**
 * Join room response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onJoinRoomResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.roomId = event.roomId;
    }
}

/**
 * Leave room response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onLeaveRoomResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.roomId = undefined;
        this.channels = { };
    }
}

/**
 * Channel disabled event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onChannelDisabled = function( event )
{
    if( event.userId !== this.userId )
    {
        return;
    }

    if( event.channelId in this.channels )
    {
        delete this.channels[event.channelId];
    }
}

/**
 * Join channel response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onJoinChannelResponse = function( event )
{
    if( event.status === "ok" )
    {
        this.channels[event.channelId] = true;
    }
}

/**
 * Leave channel response event handler.
 * @param {Object} event - The event object.
 */
AppClient.prototype.onLeaveChannelResponse = function( event )
{
    if( event.status === "ok" )
    {
        delete this.channels[event.channelId];
    }
}

/**
 * Returns whether or not the user is logged in this client.
 * @param {String} userId - The user id.
 * @return Whether or not the user is logged in this client.
 */
AppClient.prototype.isLogged = function( userId )
{
    if( userId )
    {
        return userId === this.userId;
    }
    else
    {
        return this.userId !== undefined;
    }
}

/**
 * Returns whether or not the user is joined to the channel.
 * @param {String} channelId - The channel id.
 * @return Whether or not the user is joined to the channel.
 */
AppClient.prototype.isInChannel = function( channelId )
{
    return channelId in this.channels;
}

/**
 * Validates the specified string following a regular expression.
 * @param {String} str - The string to validate.
 * @return Whether or not the string is valid.
 */
AppClient.validateString = function( str )
{
    if( !str )
    {
        return false;
    }

    let regex = new RegExp("^([a-zA-Z])(([a-zA-Z0-9]+)([.\\-_]?))*([a-zA-Z0-9])$");
    return regex.test(str);
}

export { AppClient };