import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import Room from 'views/room';
import Login from 'views/login';
import Lobby from 'views/lobby';
import Navbar from 'components/navbar';

import "./app.scss";

export default function App() {
    const [login, setLogin]       = useState(null);
    const [fetching, setFetching] = useState(true);
    const [NavItems, setNavItems] = useState({});

    const appUrl = `wss://${window.location.hostname}:8443`;
    const rtcUrl = "wss://rtcserver.brainstorm3d.com";

    useEffect(() => { //Acts like 'componentWillMount'
            console.clear();

            appClient.on('client_connected',     onConnect);
            appClient.on('client_disconnected',  onDisconnect);
            appClient.on("autologin_response",   onAutoLoginResponse);
            appClient.on("logout_response",      onLogOut);
            appClient.connect(appUrl);
            rtcClient.connect(rtcUrl);
        return () => {//Acts like /componentWillUnmount'
            appClient.off('client_connected',    onConnect);
            appClient.off('client_disconnected', onDisconnect);
            appClient.off("logout_response",     onLogOut);
            appClient.disconnect();
            rtcClient.disconnect();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appUrl, rtcUrl]); //This are the direct dependencies, the useEffect applies an observer pattern, whenever the value changes, the useEffect is called again.

    function onConnect(event) {
        console.log(`App client connected to ${appUrl}`);
        setFetching(true);
        appClient.autologin();
    }

    function onDisconnect() {
        console.log(`App client disconnected from ${appUrl}`);
    }

    function onAutoLoginResponse(event){
        let {status, description, userId, userType} = event;
        switch(status)
        {
            case 'ok': setLogin({id:userId, type:userType}); break;
            case 'error': console.error(status, description);break;
            default: console.warn(status, description); break;
        }
        setFetching(false);
    }

    function doLogOut(){
        appClient.logout();
    }

    function onLogOut(){
        setLogin(null);
    }

    function setNavItem(id, item)
    {  
        if(item === null)
            delete NavItems[id];
        else
            NavItems[id] = item;

        setNavItems( NavItems );
    }

    if(fetching) return <></>;
    if(!login)   return <Login login={login} setLogin={setLogin}/>;

    return (<>
        <Router>
            <div className="app wrapper">
                <Navbar user={login} doLogOut={doLogOut}/>
                <div id="content">
                <Switch>
                                    <Route exact path='/rooms/:roomId'> <Room user={login} setNavItem={setNavItem}/> </Route>
                        { login &&  <Route> <Lobby setLogin={setLogin} user={login} setNavItem={setNavItem}/>        </Route>}
                </Switch>
                </div>
            </div>
        </Router>
    </>);
}