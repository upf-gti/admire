import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import Room from 'views/room';
import Login from 'views/login';
import Lobby from 'views/lobby';

export default function App() {
    const [login, setLogin] = useState(null);
    const [fetching, setFetching] = useState(true);
    const appUrl = `wss://${window.location.hostname}:8443`;
    const rtcUrl = "wss://rtcserver.brainstorm3d.com";

    useEffect(() => { //Acts like 'componentWillMount'
            appClient.on('client_connected', onConnect);
            appClient.on('client_disconnected', onDisconnect);
            appClient.on("autologin_response", onAutoLoginResponse);
            appClient.connect(appUrl);
            rtcClient.connect(rtcUrl);
        return () => {//Acts like /componentWillUnmount'
            appClient.off('client_connected', onConnect);
            appClient.off('client_disconnected', onDisconnect);
            appClient.disconnect();
            rtcClient.disconnect();
        }
    }, [appUrl, rtcUrl]);

    function onConnect() {
        console.log(`App client connected to ${appUrl}`);
        setFetching(true);
        appClient.autologin();
    }

    function onDisconnect() {
        console.log(`App client disconnected from ${appUrl}`);
    }

    function onAutoLoginResponse(event){
        switch(event.status)
        {
            case 'ok': setLogin({id:event.userId, type:event.userType}); break;
            case 'error': break;
        }
        setFetching(false);
    }

    if(fetching) return <></>;

    return (<>
        <Router>
            <Switch>
                {!login && <Route> <Login setLogin={setLogin}/> </Route>}
                <Route exact path='/rooms/:roomId'> <Room user={login}/> </Route>
                { login && <Route> <Lobby setLogin={setLogin} user={login} /> </Route>}
            </Switch>
        </Router>
    </>);
}