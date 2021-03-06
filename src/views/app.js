import React, { useState, useEffect, useReducer, useContext, lazy, Suspense, useRef } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect, Link, useHistory } from 'react-router-dom';
import { Image, Button, ProgressBar  } from 'react-bootstrap';

import { getCookie, setCookie } from 'extra/cookies';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import {ToastContext} from 'components/toasts';
import {StreamSettings} from 'components/streamSettings';


import img3 from 'assets/img/wizard2.png';
import DisconnectedModal from 'components/disconnectedModal';


const Room = lazy(() => import('views/room'));
const Login = lazy(() => import('views/login'));
const Lobby = lazy(() => import('views/lobby'));
const Wizard = lazy(() => import('components/wizardModal'));
const ResetPassword = lazy(() => import('views/reset-password'));
const Navbar = lazy(() => import('components/navbar'));

export default function App() {

    const rtcUrl = "wss://admire-dev-rtc.brainstorm3d.com/";
    const appUrl = "wss://admire-dev-lobby.brainstorm3d.com/";

    const history = useHistory();
    const Log = useContext(ToastContext);
    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);
    
    const [showReconnect, setShowReconnect ]= useState(false);
    const [connected, setConnected]         = useState(false);
    const [showWiz, setShowWiz]             = useState(true);
    const [login, setLogin]                 = useState(null);
    const [NavItems, setNavItems]           = useState({});
    const [ready, setReady]                 = useReducer((state, newState)=>{ 
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
            let onUnload;
            console.clear();    
            setNavItem( 'wizzard', <li onClick={ () => setShowWiz(1) }> <Image src={img3} style={{filter:'invert(1)'}} width={24}/> Wizzard</li> );

            appClient.on("logout_response",      onLogOut);
            appClient.on('client_connected',     onAppClientConnect);
            appClient.on('client_disconnected',  onDisconnect);
            rtcClient.on('client_connected',     onRtcClientConnect);
            
            appClient.connect(appUrl);

            window.addEventListener('unload', onUnload = (e) => { 
                rtcClient.disconnect();
                appClient.disconnect(); 
            });
            
        return () => {//Acts like /componentWillUnmount'
            setNavItem('wizzard', null);
                
            appClient.off('client_connected',    onAppClientConnect);
            appClient.off('client_disconnected', onDisconnect);
            appClient.off("logout_response",     onLogOut);
            rtcClient.off('client_connected',    onRtcClientConnect);
            
            appClient.disconnect();
            rtcClient.disconnect();
            
            window.removeEventListener('unload', onUnload);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appUrl, rtcUrl]); //This are the direct dependencies, the useEffect applies an observer pattern, whenever the value changes, the useEffect is called again.

    function onAppClientConnect(event) {
        Log.info(`App client connected`);
        rtcClient.connect(rtcUrl);
    }

    function onRtcClientConnect(event) {
        Log.info(`Rtc client connected`);
        setConnected(true);
        mediaAdapter.start(); //TODO: move this where we are actually using the camera to avoid battery burn
    }

    function reconnect(){
        function reconnected(){ 
            appClient.off('client_connected', reconnected); 
            setShowReconnect(false);
        }
        appClient.off('client_connected', reconnected);
        appClient.on('client_connected',  reconnected);
        setShowReconnect(true);
    }

    function onDisconnect() {
        Log.warn(`App client disconnected`);
        setConnected(false);
        reconnect();
    }

    function doLogOut(){
        setCookie('credentials',null, 0);
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

    
    const renderLoader = () => (<>
        <ProgressBar animated now={100} />
    </>);
    
    return (<>
        <DisconnectedModal show={showReconnect} callback={ ()=>appClient.connect(appUrl)}/>
        {
            document.fullscreenEnabled && 
            <Button onClick={()=>document.fullscreen?document.exitFullscreen():document.body.requestFullscreen()} variant="link" style={{zIndex:10000, position:"absolute", top:10, right:10, border:"none", boxShadow:"none"}}> <i className={"bi " + document.fullscreen?"bi-fullscreen-exit":"bi-fullscreen"}></i> </Button>    
        }
      
        <Suspense fallback={renderLoader()}>
        <Router>
            {   !login &&  
                <Switch>
                    <Route path="/reset-password/:token"><ResetPassword /></Route>
                    <Route><Login connected={connected} login={login} setLogin={setLogin}/></Route>
                </Switch>
            }

            {   login && <div className="app wrapper">
                <Wizard show={showWiz} setShow={setShowWiz}/>               
                <Navbar user={login} doLogOut={doLogOut} items={Object.values(NavItems)}/>
                <div id="content">
                <Switch>
                        <Route exact path='/rooms/:roomId'> <Room user={login} setNavItem={setNavItem}/> </Route>
                        <Route> <Lobby setLogin={setLogin} user={login} setNavItem={setNavItem} key={Math.floor((Math.random() * 10000))} /> </Route>
                </Switch>

                </div>
                </div> 
            }
        </Router>
        </Suspense>
        <style global jsx>{`
            @import "variables.scss";

            .app{
                background-color: $background !important;
                min-height:100%;
            }
        `}</style>
    </>);
}