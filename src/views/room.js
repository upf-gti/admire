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
    const [ roomInfo,     setRoomInfo ]     = useState(null);
    const [ settings,     setSettings ]     = useState(null);
    const [ resolutions,  setResolutions ]  = useState(null);
    const [ audioDevices, setAudioDevices ] = useState(null);
    const [ videoDevices, setVideoDevices ] = useState(null);

    useEffect(() => {//Executes when this component is mounted
        appClient.on('get_rooms_response',  onGetRooms);
        appClient.on('join_room_response',  onJoinRoom);
        //appClient.on('master_left_room',  onMasterLeft  = ()=>{ debugger; });
        //appClient.on('guest_joined_room', onGuestJoined = ({userId, roomId})=>{ roomInfo.guests.concat(userId);setRoomInfo(roomInfo);});
        //appClient.on('guest_left_room',   onGuestLeft   = ({userId, roomId})=>{ let i = roomInfo.guests.indexOf(userId); if(i>0){roomInfo.guests.splice(i,1);setRoomInfo(roomInfo);} });
        appClient.getRooms();
        
        let  onErrorDevices, onErrorStream;
        mediaAdapter.on("error_stream",     onErrorStream       = ( {description})=>console.error("Stream error:", description));
        mediaAdapter.on("error_devices",    onErrorDevices      = ( {description})=>console.error("Media devices error:", description));
        mediaAdapter.on("got_stream",       onGotStream       );
        mediaAdapter.on("got_devices",      onGotDevices      );
        mediaAdapter.on("got_resolutions",  onGotResolutions  );
        mediaAdapter.findDevices();                                                                

        rtcClient.on("call_started",  onCallStarted);
        rtcClient.on("incoming_call", onIncomingCall);

    return () => {//Executes on dismount
        appClient.off("guest_joined_room",  onGuestJoined);
        appClient.off('get_rooms_response', onGetRooms);
        appClient.off('join_room_response', onJoinRoom);
        //appClient.leaveRoom();

        mediaAdapter.off("error_stream",    onErrorStream     );
        mediaAdapter.off("error_devices",   onErrorDevices    );
        mediaAdapter.off("got_stream",      onGotStream       );
        mediaAdapter.off("got_devices",     onGotDevices      ); 
        mediaAdapter.off("got_resolutions", onGotResolutions  );

        rtcClient.off('call_started',       onCallStarted);
        rtcClient.off('incoming_call',      onIncomingCall);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ roomId ]);  

    function onGetRooms( { id, status, roomInfos } ) 
    { 
        let room = roomInfos[roomId];
        setRoomInfo( room );

        if(!room) 
            return console.error(`Room ${roomId} does not exist.`);

        if(room.master !== user.id)
            return appClient.joinRoom(roomId);

        setReady(true);
        doMakeCalls();
    }

    function onGotResolutions({resolutions})
    { setResolutions(resolutions); }

    function onGotDevices ({ audioDevices, videoDevices, settings }) 
    { setSettings(settings); setAudioDevices(audioDevices); setVideoDevices(videoDevices); }


    function onGotStream( {stream, settings})
    { 
        if(!localVideo || !localVideo.current ) 
            return;
        
        localVideo.current.srcObject = stream;

        //setStream(stream); 
        //setAudio(settings.audio); 
        //setVideo(settings.video); 
        //setResolution(settings.resolution); 
        //rtcClient.replaceStream(callId, stream);
    }

    function  onJoinRoom ({ status, description, userId, userType, channels })
    { }

    function doMakeCalls()
    {
        if(!roomInfo || !roomInfo.guests) 
            return console.error("no roominfo");

        let users = roomInfo.guests.concat(roomInfo.master);
        users = users.filter( (v,k,a) => { return v != user.id });

        //Call other guests
        let all_ok = true;
        for(let u in users)
        {
            all_ok |= rtcClient.call( users[u], dummyStream.getStream() );
        }
        if(!all_ok) console.error("some call missed");
        else console.log("all ok!");
    }

    function onIncomingCall({ callId, callerId })
    {
        //if(!roomInfo.guests.includes(callerId))return rtcClient.cancelCall(callId);
        //TODO: añadir elemento de video
        rtcClient.acceptCall( callId, dummyStream.getStream() );
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
            <Button onClick={doMakeCalls}> Join Now</Button>
            { ready && /*Streaming  */ (<>
                <h1 style={{color:"white"}}>Live</h1>
                { users && users.map( (v,k,a) => <VideoStream key={k} stream={v.stream}/>) }
                <VideoStream local audioDevices={audioDevices} videoDevices={videoDevices} settings={settings} fref={localVideo}/>
            </>)}



            {!ready && /*Preparation*/ (<> 
                <h1 style={{color:"white"}}>Preparation</h1>
                <VideoStream local audioDevices={audioDevices} videoDevices={videoDevices} settings={settings} fref={localVideo}/>

            </>)}

        </Col>
        </Row>
    </Container>
    </>)
}