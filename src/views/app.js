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
import {Toasts, ToastContext} from 'components/toasts';

import "./app.scss";
import img3 from 'assets/img/wizard2.png';

const rtcUrl = "wss://rtcserver.brainstorm3d.com";
const appUrl = `wss://teleporter.brainstorm3d.com:8443/`;
//const appUrl = `wss://${window.location.hostname}:8443`;//process.env.PROXY;
let timeoutId; 
export default function App() {

    const Log = useContext(ToastContext);
    const [list] = Log.toasts;
    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);
    

    const [login, setLogin]       = useState(null);
    const [fetching, setFetching] = useState(true);
    const [NavItems, setNavItems] = useState({});
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

  
    useEffect(() => { //Acts like 'componentWillMount'
            console.clear();    
            setFetching(true);
            

            setNavItem( 'wizzard',<Link to='/wizzard'> <li> <Image src={img3} style={{filter:'invert(1)'}} width={24}/> Wizzard</li> </Link> );

            appClient.on("logout_response",      onLogOut);
            appClient.on('client_connected',     onConnect);
            appClient.on('client_disconnected',  onDisconnect);
            appClient.on("autologin_response",   onAutoLoginResponse);
            
            function heartbeat(){
                if(!appClient.ws) appClient.connect(appUrl);
                if(!rtcClient.ws) rtcClient.connect(rtcUrl);
                timeoutId = setTimeout(heartbeat,1000);
            }

            appClient.connect(appUrl);
            rtcClient.connect(rtcUrl);

        return () => {//Acts like /componentWillUnmount'
            setNavItem('wizzard', null);
            //clearTimeout(timeoutId);

            appClient.off('client_connected',    onConnect);
            appClient.off('client_disconnected', onDisconnect);
            appClient.off("logout_response",     onLogOut);

            appClient.disconnect();
            rtcClient.disconnect();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appUrl, rtcUrl]); //This are the direct dependencies, the useEffect applies an observer pattern, whenever the value changes, the useEffect is called again.


    function onConnect(event) {
        Log.info(`App client connected`);
        appClient.autologin();
        mediaAdapter.start();
    }

    function onDisconnect() {
        Log.warn(`App client disconnected`);
    }

    function onAutoLoginResponse(event){
        let {status, description, userId, userType} = event;
        setFetching(false);

        switch(status)
        {
            case 'ok': {
                Log.success(`Autlogin for ${userId}`);
                setLogin({id:userId, type:userType}); 
                rtcClient.register(userId);
                break;
            }
            case 'error': Log.error(description);break;
            default: Log.warn(description); break;
        }
    }

    function doLogOut(){
        appClient.logout();
    }

    function onLogOut(){
        Log.info(`Logout`);
        setLogin(null);
        rtcClient.unregister();
    }

    function setNavItem(id, item)
    {  
        if(item === null)
            delete NavItems[id];
        else
            NavItems[id] = item;

        setNavItems( Object.assign({},NavItems) );
    }

    if(fetching) return <><Toasts/></>
    if(!login) return <><Login login={login} setLogin={setLogin}/></>;

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