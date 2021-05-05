import React, { useState, useEffect, useReducer, useContext } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect, Link } from 'react-router-dom';
import { Image } from 'react-bootstrap';

import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import Room from 'views/room';
import Login from 'views/login';
import Lobby from 'views/lobby';
import Wizard from 'views/wizzard';
import Navbar from 'components/_navbar';
import {StreamSettings} from 'components/streamSettings';
import {Toasts} from 'components/toasts';

import "./app.scss";
import img3 from 'assets/img/wizard2.png';


export default function App() {

    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);

    const [ready, setReady] = useReducer((state, newState)=>{ 
        localStorage.setItem('admire-user-ready', newState);
        sessionStorage.setItem('admire-user-ready', newState);
        return newState; 
    }, null, 
    (initialValue)=>{
        let state = JSON.parse(sessionStorage.getItem('admire-user-ready') ?? localStorage.getItem('admire-user-ready')) ?? initialValue;
        localStorage.setItem('admire-user-ready', state);
        sessionStorage.setItem('admire-user-ready', state); 
        return state;
    });  

    const [login, setLogin]       = useState(null);
    const [NavItems, setNavItems] = useState({});

    //const appUrl = `wss://${window.location.hostname}:8443`;//process.env.PROXY;
    const appUrl = `wss://teleporter.brainstorm3d.com:8443/`;
    const rtcUrl = "wss://rtcserver.brainstorm3d.com";
    

    useEffect(() => { //Acts like 'componentWillMount'
            setNavItem( 'wizzard',<Link to='/wizzard'> <li> <Image src={img3} style={{filter:'invert(1)'}} width={24}/> Wizzard</li> </Link> );

            console.clear();

            appClient.on("logout_response",      onLogOut);
            appClient.on('client_connected',     onConnect);
            appClient.on('client_disconnected',  onDisconnect);
            appClient.on("autologin_response",   onAutoLoginResponse);
            
            function heartbeat(){
                if(!appClient.ws) appClient.connect(appUrl);
                if(!rtcClient.ws) rtcClient.connect(rtcUrl);
            }
            const intervalID = setInterval(heartbeat,1000);

        return () => {//Acts like /componentWillUnmount'
            clearInterval(intervalID);
            setNavItem('wizzard', null);

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
        appClient.autologin();
        mediaAdapter.start();
    }

    function onDisconnect() {
        console.log(`App client disconnected from ${appUrl}`);
    }

    function onAutoLoginResponse(event){
        let {status, description, userId, userType} = event;
        switch(status)
        {
            case 'ok': {
                setLogin({id:userId, type:userType}); 
                rtcClient.register(userId);
                break;
            }
            case 'error': console.error(status, description);break;
            default: console.warn(status, description); break;
        }
    }

    function doLogOut(){
        appClient.logout();
    }

    function onLogOut(){
        setLogin(null);
        rtcClient.unregister();
    }

    function setNavItem(id, item)
    {  
        if(item === null)
            delete NavItems[id];
        else
            NavItems[id] = item;

        setNavItems( NavItems );
    }

    if(!login) return <><Toasts/><Login login={login} setLogin={setLogin}/></>;

    return (<>
        <Router>
            <Toasts/>
            <div className="app wrapper">
                <Navbar user={login} doLogOut={doLogOut} items={Object.values(NavItems)}/>
                <div id="content">
                <Switch>
                        { !ready && <Wizard ready={{ready, setReady}} setNavItem={setNavItem}/> }
                        <Route exact path='/wizzard'> <Wizard ready={{ready, setReady}} setNavItem={setNavItem}/> </Route>
                        <Route exact path='/rooms/:roomId'> <Room user={login} setNavItem={setNavItem}/> </Route>
                        <Route> <Lobby setLogin={setLogin} user={login} setNavItem={setNavItem} key={Math.floor((Math.random() * 10000))} /> </Route>
                </Switch>
                </div>
            </div>
        </Router>
    </>);
}