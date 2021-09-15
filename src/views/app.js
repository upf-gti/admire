import React, { useState, useEffect, useReducer, useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect, Link, useHistory } from 'react-router-dom';
import { Image, Button, ProgressBar  } from 'react-bootstrap';

import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import {ToastContext} from 'components/toasts';
import {StreamSettings} from 'components/streamSettings';

import "./app.scss";
import img3 from 'assets/img/wizard2.png';


const Room = lazy(() => import('views/room'));
const Login = lazy(() => import('views/login'));
const Lobby = lazy(() => import('views/lobby'));
const Wizzard = lazy(() => import('views/wizzard'));
const ResetPassword = lazy(() => import('views/reset-password'));
const Navbar = lazy(() => import('components/navbar'));


let timeoutId; 
export default function App() {

    const rtcUrl = "wss://admire-dev-rtc.brainstorm3d.com/";
    const appUrl = "wss://admire-dev-lobby.brainstorm3d.com/";

    const history = useHistory();
    const Log = useContext(ToastContext);
    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);
    
    const [login, setLogin]       = useState(null);
    const [fetching, setFetching] = useState(false);
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
            //setFetching(true);
            setNavItem( 'wizzard',<Link to='/wizzard'> <li> <Image src={img3} style={{filter:'invert(1)'}} width={24}/> Wizzard</li> </Link> );

            appClient.on("logout_response",      onLogOut);
            appClient.on('client_connected',     onAppClientConnect);
            appClient.on('client_disconnected',  onDisconnect);
            //appClient.on("autologin_response",   onAutoLoginResponse);
            
            rtcClient.on('client_connected',     onRtcClientConnect);
            
            appClient.connect(appUrl);
            
        return () => {//Acts like /componentWillUnmount'
            setNavItem('wizzard', null);

            appClient.off('client_connected',    onAppClientConnect);
            appClient.off('client_disconnected', onDisconnect);
            appClient.off("logout_response",     onLogOut);
            
            rtcClient.off('client_connected',    onRtcClientConnect);

            appClient.disconnect();
            rtcClient.disconnect();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appUrl, rtcUrl]); //This are the direct dependencies, the useEffect applies an observer pattern, whenever the value changes, the useEffect is called again.

    function onAppClientConnect(event) {
        Log.info(`App client connected`);
        rtcClient.connect(rtcUrl);
    }

    function onRtcClientConnect(event) {
        Log.info(`Rtc client connected`);
        //appClient.autologin();
        mediaAdapter.start();
    }

    function onDisconnect() {
        Log.warn(`App client disconnected`);
    }

    /*function onAutoLoginResponse(event){
        let {status, description, userId, userType} = event;
        //setFetching(false);

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
    }*/

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

    
    const renderLoader = () => (<>
        <ProgressBar animated now={100} />
    </>);

    return (<>
        {
            document.fullscreenEnabled && 
            <Button onClick={()=>document.fullscreen?document.exitFullscreen():document.body.requestFullscreen()} variant="link" style={{zIndex:10000, position:"absolute", top:10, right:10, border:"none", boxShadow:"none"}}> <i className={"bi " + document.fullscreen?"bi-fullscreen-exit":"bi-fullscreen"}></i> </Button>    
        }
      
        <Suspense fallback={renderLoader()}>
        <Router>
            { !login && <Route exact path='/reset-password/:token'> <ResetPassword/> </Route> }
            { !login && <Route><Login login={login} setLogin={setLogin}/></Route> }

            { login && <div className="app wrapper">
                <Navbar user={login} doLogOut={doLogOut} items={Object.values(NavItems)}/>
                <div id="content">
                <Switch>
                        { !ready && <Wizzard user={login} ready={{ready, setReady}} setNavItem={setNavItem}/> }
                        <Route exact path='/wizzard'> <Wizzard user={login} ready={{ready, setReady}} setNavItem={setNavItem}/> </Route>
                        <Route exact path='/rooms/:roomId'> <Room user={login} setNavItem={setNavItem}/> </Route>
                        <Route> <Lobby setLogin={setLogin} user={login} setNavItem={setNavItem} key={Math.floor((Math.random() * 10000))} /> </Route>
                </Switch>
                </div>
            </div> }
        </Router>
        </Suspense>
    </>);
}