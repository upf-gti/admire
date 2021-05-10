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
import {Toasts, ToastContext} from 'components/toasts';



export default function Room({user, setNavItems})
{
    const Log = useContext(ToastContext);
    //All stream properties
    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);


    //References for vDOM elements
    //let localVideo                          = useRef(null);

    //Retrieved from URL
    let { roomId } = useParams();
    let [ state, setState ]   = useState(0);
    let [ calls, setCalls ]   = useState(0);

    function forcerefresh() { 
        setState(state+1)
        setTimeout(forcerefresh, 2000); 
    }


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
        appClient.on('get_rooms_response',  onGetRooms  = ({id, status, description, roomInfos}) => { setRoomInfo( Object.assign({},roomInfos[roomId]) ); });
        appClient.on('master_left_room',    onMasterLeft= (message)=>{ Log.warn('Master left'); /* modal master left, on ok return lobby*/window.location = '/'; }); //Tal vez estos tres podrian devolver la info de la room 
        appClient.on('guest_joined_room',   onGuestJoin = (message)=>{ console.log(message); Log.info('Guest joined'); appClient.getRooms(); }); //asi no lo he de pedir cada vez.
        appClient.on('guest_left_room',     onGuestLeft = (message)=>{ console.log(message); Log.warn('Guest left'); appClient.getRooms(); }); //
        
        rtcClient.on("incoming_call", onIncomingCall);
        rtcClient.on("call_started",  onCallStarted);
        rtcClient.on("call_response", onCallResponse);
        rtcClient.on('user_hangup',   onCallHangup);
        
        //This is to be sure when user is leaving the room because a refresh/closing/leaving the tab
        let onBeforeUnload; 
        window.addEventListener('beforeunload', onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; });

        //Validate the room exists before joining // do we really need this?
        let validationCallback;
        appClient.getRooms();
        appClient.on('get_rooms_response',  validationCallback = ({id, status, description, roomInfos}) => { 
            roomInfo = roomInfos[roomId];
            if(!roomInfo){
                Log.error("No RoomInfo");
                window.location = '/';
                return; 
            } 
            setRoomInfo( Object.assign({}, roomInfo)); 
            appClient.joinRoom(roomId);
            appClient.off('get_rooms_response',  validationCallback);
        });

        forcerefresh();

    return () => {//Executes on dismount
        Log.warn('room dismount');
        appClient.off('get_rooms_response', onGetRooms);
        appClient.off('join_room_response', onJoinRoom);
        appClient.off('master_left_room',   onMasterLeft);
        appClient.off('guest_joined_room',  onGuestJoin);
        appClient.off('guest_left_room',    onGuestLeft);
        
        rtcClient.off('incoming_call',      onIncomingCall);
        rtcClient.off('call_started',       onCallStarted);
        rtcClient.off("call_response",      onCallResponse);
        rtcClient.off('user_hangup',        onCallHangup);
        
        window.removeEventListener('beforeunload', onBeforeUnload);
        
        Object.keys(rtcClient.peers).forEach( callId => rtcClient.hangup(callId));
        appClient.leaveRoom();

        console.log('dismount');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ roomId ]);  

    function  onJoinRoom ({ status, description, userId, userType, channels })
    { 
        
        if(!roomInfo){
            Log.error("No RoomInfo");
            return; 
        } 
        Log.success(`Joined to room ${roomId}`);
        //if(status === 'error') return console.error(status, description);

        let stream = dummyStream.getStream();//localStream;// ?? dummyStream.getStream();
        let users =  [...roomInfo.guests, roomInfo.master].filter( (v,k,a) => { return v !== user.id });

        for(let user of users)
        {
            Log.warn(`Attempting call to ${user}`);

            if(!rtcClient.call( user, stream ))
                Log.error(`call missed to ${user}`);
        }
    }

    function onIncomingCall({ callId, callerId })
    {
        Log.warn(`onIncomingCall`);
        let stream = dummyStream.getStream();// localStream;// ?? dummyStream.getStream();
        rtcClient.acceptCall( callId, stream );
        setState(state+1);
    }

    function onCallResponse(message)
    {
        Log.warn(`onCallResponse`);
        console.log(message)
    }

    function onCallStarted({ callId, stream })
    {
        Log.success(`Call ${callId} started`);

        window.streams = streams;
        
        streams[callId] = stream;
        setStreams(Object.assign({},streams));

        //rtcClient.replaceLocalStream(callId, localStream);

        let track = localStream.getVideoTracks()[0];
        track.enabled = true;
        rtcClient.replaceLocalVideoTrack(callId, track);
        


        //const localStream = localVideo.current.srcObject;
        //const track = localStream.getAudioTracks()[0];
        //rtcClient.replaceLocalAudioTrack( callId, track );
    }

    function onCallHangup({callId, state})
    {
        Log.warn(`Call ${callId} hangup`);
        delete streams[callId];
        setStreams(Object.assign({},streams));
    }


    if(!roomInfo)   return <V404 title={`Room '${roomId}' does not exist`} description='some description'/>;

    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${ user.id }`}</title>
        </Helmet>

        <Container id="room" className="text-center" fluid="md" >
            <h1 id="title" style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}>#{roomId}</h1>
            <Row className="justify-content-center"> 
            


                {/*< VideoStream fkey={-1} local audioDevices={audioDevices} videoDevices={videoDevices} settings={settings} fref={localVideo} />
                { users && users.map( (v,k,a) => <VideoStream fkey={k} stream={v.stream}/>) }*/}
                <Col xs={12} className='mb-2  p-0'>
                    <Video id={'local'} key={-1} stream={localStream} local playsInline/>
                </Col>


                {false && streams && Object.entries(streams).map((v,k,a) => {
                    if(!rtcClient.peers[v[0]]) return
                    let {calleeId, callerId} =  rtcClient.peers[v[0]];
                    let id = calleeId === user.id? callerId : calleeId;
                    return <Col key={k}>
                        <Video  id={id} stream={ v[1] } playsInline/> 
                    </Col> 
                    }
                )}


                {
                    Array(10).fill().map( v => <Col xs={6} className='mt-1 p-0'>
                        <Video/> 
                    </Col>)
                }
    
            </Row>
        </Container>
    </>)
}