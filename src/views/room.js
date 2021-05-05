import Helmet from 'react-helmet';
import { useState, useEffect, useRef, useContext } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';

import "./room.scss";
import V404 from 'views/v404';
import Video from 'components/video';
import VideoStream from 'components/videostream';
import {StreamSettings} from 'components/streamSettings';


export default function Room({user, setNavItems})
{
    //All stream properties
    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);


    //References for vDOM elements
    //let localVideo                          = useRef(null);

    //Retrieved from URL
    let { roomId } = useParams();
    let [ state, setState ]   = useState(0);

    let [ streams, setStreams ]   = useState({});
    let [ roomInfo, setRoomInfo ] = useState(null);
    let [ selected, setSelected ] = useState('local');

    //let   [ users,        setUsers ]        = useState( [] );
    //const [ settings,     setSettings ]     = useState(null);
    //const [ resolutions,  setResolutions ]  = useState(null);
    //const [ audioDevices, setAudioDevices ] = useState(null);
    //const [ videoDevices, setVideoDevices ] = useState(null);

    useEffect(() => {//Executes when this component is mounted
        let  onGuestJoin, onGuestLeft, onMasterLeft, onGetRooms;
        appClient.on('join_room_response',  onJoinRoom);
        appClient.on('get_rooms_response',  onGetRooms  = ({id, status, description, roomInfos}) => { setRoomInfo( roomInfos[roomId] ); });
        appClient.on('master_left_room',    onMasterLeft= (message)=>{ appClient.getRooms(); }); //Tal vez estos tres podrian devolver la info de la room 
        appClient.on('guest_joined_room',   onGuestJoin = (message)=>{ appClient.getRooms(); }); //asi no lo he de pedir cada vez.
        appClient.on('guest_left_room',     onGuestLeft = (message)=>{ appClient.getRooms(); }); //
        
        rtcClient.on("incoming_call", onIncomingCall);
        rtcClient.on("call_started",  onCallStarted);
        rtcClient.on('user_hangup',   onCallHangup);
        
        //This is to be sure when user is leaving the room because a refresh/closing/leaving the tab
        let onBeforeUnload; 
        window.addEventListener('beforeunload', onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; });

        //Validate the room exists before joining // do we really need this?
        let validationCallback;
        appClient.getRooms();
        appClient.on('get_rooms_response',  validationCallback = ({id, status, description, roomInfos}) => { 
            roomInfo = roomInfos[roomId];
            if(!roomInfo) return;
            setRoomInfo( roomInfo ); 
            appClient.joinRoom(roomId);
            appClient.off('get_rooms_response',  validationCallback);
        });

    return () => {//Executes on dismount
        appClient.off('get_rooms_response', onGetRooms);
        appClient.off('join_room_response', onJoinRoom);
        appClient.off('master_left_room',   onMasterLeft);
        appClient.off('guest_joined_room',  onGuestJoin);
        appClient.off('guest_left_room',    onGuestLeft);
        
        rtcClient.off('incoming_call',      onIncomingCall);
        rtcClient.off('call_started',       onCallStarted);
        rtcClient.off('user_hangup',        onCallHangup);
        
        window.removeEventListener('beforeunload', onBeforeUnload);
       
        rtcClient.hangup();
        appClient.leaveRoom();

        console.log('dismount');

        alert('leaving')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ roomId ]);  

    function  onJoinRoom ({ status, description, userId, userType, channels })
    { 
        if(!roomInfo) return console.error("no roominfo");
        //if(status === 'error') return console.error(status, description);

        let stream = localStream;// ?? dummyStream.getStream();
        let users = roomInfo.guests.concat(roomInfo.master).filter( (v,k,a) => { return v !== user.id });

        for(let user of users)
        {
            if(!rtcClient.call( user, stream ))
                console.error(`call missed to ${user}`);
        }
    }

    function onIncomingCall({ callId, callerId })
    {
        let stream = localStream;// ?? dummyStream.getStream();
        rtcClient.acceptCall( callId, stream );
    }

    function onCallStarted({ callId, stream })
    {
        window.streams = streams;
        streams[callId] = stream;
        setStreams(streams);
        setState(state+1);


        //const localStream = localVideo.current.srcObject;
        //const track = localStream.getAudioTracks()[0];
        //rtcClient.replaceLocalAudioTrack( callId, track );
    }

    function onCallHangup({callId, state})
    {
        delete streams[callId];
        setStreams(streams);
        setState(state+1);
    }


    if(!roomInfo)   return <V404 title={`Room '${roomId}' does not exist`} description='some description'/>;

    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${ user.id }`}</title>
        </Helmet>

        <Container id="room" className="text-center">
            <h1 id="title" style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}>#{roomId}</h1>
            <Row className="justify-content-center">


                {/*< VideoStream fkey={-1} local audioDevices={audioDevices} videoDevices={videoDevices} settings={settings} fref={localVideo} />
                { users && users.map( (v,k,a) => <VideoStream fkey={k} stream={v.stream}/>) }*/}
                <Col xs={12} className='mb-2'>
                    <Video key={-1} stream={localStream} local playsInline/>
                </Col>


                { 
                    (()=>{
                        return Object.values(streams).map((v,k,a) => {
                        //return [1,2,3,4,5,6].map((v,k,a) => {
                            //return (<h1 key={k} >Hola! {k}</h1>);
                            return <Col key={k} xs={6}> <Video  stream={ v } playsInline/> </Col>;
                            //return <Col xs={6}><Video key={k} stream={ dummyStream.getStream() } playsInline/></Col>;
                        })
                    })()
                }
    
            </Row>
        </Container>
    </>)
}