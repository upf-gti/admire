import Helmet from 'react-helmet';
import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';

import "./room.scss";
import V404 from 'views/v404';
import VideoStream from 'components/videostream';

export default function Room({user, setNavItems})
{
    const [ready,  setReady ]               = useState(false);

    //References for vDOM elements
    let localVideo                          = useRef(null);

    //Retrieved from URL
    const { roomId }                        = useParams();
    let   [ users,        setUsers ]        = useState( [] );
    let [ roomInfo,     setRoomInfo ]     = useState(null);
    const [ settings,     setSettings ]     = useState(null);
    const [ resolutions,  setResolutions ]  = useState(null);
    const [ audioDevices, setAudioDevices ] = useState(null);
    const [ videoDevices, setVideoDevices ] = useState(null);

    useEffect(() => {//Executes when this component is mounted
        let  onGuestJoin, onGuestLeft;
        appClient.on('get_rooms_response',  onGetRooms);
        appClient.on('join_room_response',  onJoinRoom);
        //appClient.on('master_left_room',  onMasterLeft  = ()=>{ debugger; });
        appClient.on('guest_joined_room',   onGuestJoin = ()=>{ appClient.getRooms(); });
        appClient.on('guest_left_room',     onGuestLeft = ()=>{ appClient.getRooms(); });
        appClient.getRooms();
        
        //ES CUESTION DE QUE LO PONGA AQUI SIMPLEMENTE 
        appClient.joinRoom(roomId);

        rtcClient.on("call_started",  onCallStarted);
        rtcClient.on("incoming_call", onIncomingCall);

        let onBeforeUnload;
        window.addEventListener('beforeunload', onBeforeUnload = function (e) {
            // Cancel the event
            e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
            e.returnValue = ''; // Chrome requires returnValue to be set
        });

    return () => {//Executes on dismount
        appClient.off('get_rooms_response', onGetRooms);
        appClient.off('join_room_response', onJoinRoom);
        appClient.off('guest_joined_room',  onGuestJoin);
        appClient.off('guest_left_room',    onGuestLeft);
        appClient.leaveRoom();

        rtcClient.off('call_started',       onCallStarted);
        rtcClient.off('incoming_call',      onIncomingCall);
        window.removeEventListener('beforeunload', onBeforeUnload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ roomId ]);  

    function onGetRooms( { id, status, roomInfos } ) 
    { 
        setRoomInfo( roomInfos[roomId] );
        //if(!room) return console.error(`Room ${roomId} does not exist.`);
        //if(room.master !== user.id)return appClient.joinRoom(roomId);
        //setReady(true);
    }

    function doJoin()
    {
        appClient.joinRoom(roomId);
    }

    function  onJoinRoom ({ status, description, userId, userType, channels })
    { 
        doMakeCalls();
    }

    function doMakeCalls()
    {
        setReady(true);

        if(!roomInfo) 
            return console.error("no roominfo");

        let users = roomInfo.guests.concat(roomInfo.master);
        users = users.filter( (v,k,a) => { return v !== user.id });

        let stream;
        try{
            stream = localVideo.current.srcObject
        }catch(e){
            console.error(e) 
        }
        stream = stream ?? dummyStream.getStream();

        //Call other guests
        let all_ok = true;
        for(let u in users)
        {
            all_ok |= rtcClient.call( users[u], stream );
        }
        if(!all_ok) console.error("some call missed");
        else console.log("all ok!");
    }

    function onIncomingCall({ callId, callerId })
    {
        debugger;

        //if(!roomInfo.guests.includes(callerId))return rtcClient.cancelCall(callId);
        //TODO: añadir elemento de video
        let stream;
        try{
            stream = localVideo.current.srcObject
        }catch(e){
            console.error(e) 
        }
        stream = stream ?? dummyStream.getStream();

        rtcClient.acceptCall( callId, stream );
    }

    function onCallStarted({ callId, stream })
    {
            if(!localVideo || !localVideo.current ) 
                return console.error("no video element found or null");
            
            //TODO:

            console.log(users);
            setUsers( users.concat({stream: stream, callId: callId}) );
            //const localStream = localVideo.current.srcObject;
            //const track = localStream.getAudioTracks()[0];
            //rtcClient.replaceLocalAudioTrack( callId, track );
    }


    if(!roomInfo)   return <V404 title={`Room ${roomId} does not exist`} description='some description'/>;
    
    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${ user.id }`}</title>
        </Helmet>

        <Container fluid="xs" id="room" className="text-center">
        <Row className="justify-content-md-center">
        <Col xs={12} lg={6} xl={4}>
            <h1 id="title" style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}>#{roomId}</h1>
            { ready && /*Streaming  */ (<>
                <h1 style={{color:"white"}}>Live</h1>
                { users && users.map( (v,k,a) => <VideoStream fkey={k} stream={v.stream}/>) }
                <VideoStream fkey={-1} local audioDevices={audioDevices} videoDevices={videoDevices} settings={settings} fref={localVideo}/>
            </>)}

            {!ready && /*Preparation*/ (<> 
                <Button onClick={doJoin}> Join Now</Button>
                <h1 style={{color:"white"}}>Preparation</h1>
                <VideoStream fkey={-1} local audioDevices={audioDevices} videoDevices={videoDevices} settings={settings} fref={localVideo}/>
            </>)}

        </Col>
        </Row>
    </Container>
    </>)
}