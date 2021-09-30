import Helmet from 'react-helmet';
import { useState, useEffect, useRef, useContext } from 'react';
import { Container, Row, Col, Button, Modal, Form, OverlayTrigger } from 'react-bootstrap';
import { useParams, useHistory, Link } from 'react-router-dom';
import { RTCEvent, rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';

import "./room.scss";
import V404 from 'views/v404';
import Video from 'components/video';
import VideoStream from 'components/videostream';
import { StreamSettings } from 'components/streamSettings';
import { Toasts, ToastContext } from 'components/toasts';
import ForwardStreamModal from 'components/forwardStreamModal';



export default function Room({ user, setNavItems }) {
    //Params    
    let [state, setState] = useState(0);
    let [streams, setStreams] = useState({});
    let [liveCalls, setLiveCalls] = useState({});
    let [roomInfo, setRoomInfo] = useState(null);
    let [showModal, setShowModal] = useState(null);

    //Retrieved from URL
    const Log = useContext(ToastContext);
    let { roomId } = useParams();
    
    //Other stuff
    let history = useHistory();
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream] } = useContext(StreamSettings);

    useEffect(() => {//Executes when this component is mounted
        let onGuestJoin, onGuestLeft, onMasterLeft, onUnload, onGetRoom;
        appClient.on('get_room_response'    , onGetRoom    = ({roomInfo})   => setRoomInfo(Object.assign({}, roomInfo)));
        appClient.on('guest_left_room'      , onGuestLeft  = (message)      => { Log.warn('Guest left');   appClient.getRoom(); }); //
        appClient.on('master_left_room'     , onMasterLeft = (message)      => { Log.warn('Master left'); /* modal master left, on ok return lobby*/ history.push('/') });  //Tal vez estos tres podrian devolver la info de la room 
        appClient.on('guest_joined_room'    , onGuestJoin  = (message)      => { Log.info('Guest joined'); appClient.getRoom(); }); //asi no lo he de pedir cada vez.

        rtcClient.on(RTCEvent.IncomingCall  , onIncomingCall );
        rtcClient.on(RTCEvent.CallOpened    , onCallOpened   );
        rtcClient.on(RTCEvent.CallClosed    , onCallClosed   );
        rtcClient.on(RTCEvent.UserHangup    , onCallHangup   );

        //This is to be sure when user is leaving the room because a refresh/closing/leaving the tab
        window.addEventListener('unload', onUnload = (e) => { appClient.leaveRoom(); });
        
        (async function(){
            roomInfo = await validateRoom(roomId);
            setRoomInfo(Object.assign({}, roomInfo));
            console.log(roomInfo);
            if (roomInfo && [...roomInfo.guests ?? [], roomInfo.master].filter(v => v !== user.id).length){
                console.log('join now!')
                joinRoom(roomId)
                .then(callUsers)
                .then(forcerefresh);
            }
        })();
            
        return () => {//Executes on dismount
            appClient.off('get_room_response'   , onGetRoom    );
            appClient.off('master_left_room'    , onMasterLeft  );
            appClient.off('guest_joined_room'   , onGuestJoin   );
            appClient.off('guest_left_room'     , onGuestLeft   );

            rtcClient.off(RTCEvent.IncomingCall , onIncomingCall );
            rtcClient.off(RTCEvent.CallOpened   , onCallOpened   );
            rtcClient.off(RTCEvent.CallClosed   , onCallClosed   );
            rtcClient.off(RTCEvent.UserHangup   , onCallHangup   );

            window.removeEventListener('unload', onUnload);
            
            Object.keys(rtcClient.getCalls()).forEach(callId => rtcClient.hangup(callId));
            appClient.leaveRoom();

            console.log('dismount');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    function forcerefresh() {
        setState(state + 1)
        setTimeout(forcerefresh, 2000);
    }

    function validateRoom(roomId) {
        return new Promise((resolve, reject) => {
            function success(data) {
                let { id, status, description, roomInfos } = data;
                appClient.off('get_rooms_response', success);
                if (status === 'error') reject(data);
                else resolve(roomInfos[roomId] ?? false);
            }
            appClient.on('get_rooms_response', success);
            appClient.getRooms();
        });
    }
    
    function joinRoom(roomId) {
        return new Promise((resolve, reject) => {
            function success(data) {
                appClient.off('join_room_response', success);
                if (data?.status === 'error')
                {
                    Log.error(`Error onJoinRoom ${data?.description}`);
                    reject(data);
                    return;
                } 
                Log.success(`Joined to room ${roomId}`);
                resolve(data);
            }
            appClient.on('join_room_response', success);
            appClient.joinRoom(roomId);
        });
    }

    function callUsers() {
        if(!roomInfo) return;
        let users = [...roomInfo.guests, roomInfo.master].filter((v, k, a) => { return v !== user.id });
        for (let user of users) 
        {
            if (!rtcClient.call(user, () => console.log('call response')))
                Log.error(`call missed to ${user}`);
        }
    }

    function onIncomingCall({ callId, callerId }) {
        rtcClient.acceptCall(callId);
        setState(state + 1);
    }

    function onCallOpened({ call, stream }) {
        const callId = call.callId;

        window.streams = streams;
        streams[callId] = stream;
        setStreams(Object.assign({}, streams));
        
        const forwardingCallId = liveCalls[callId];
        //Live call
        if(forwardingCallId){ 
            const forward_stream = streams[forwardingCallId];
            if(!forward_stream)
            {
                rtcClient.hangup(callId);
                return;
            }
            Log.success(`Live Call: ${callId}`);
            let videotrack = forward_stream.getVideoTracks()[0];
            let audiotrack = forward_stream.getAudioTracks()[0];   
            call.replaceLocalVideoTrack(videotrack);
            call.replaceLocalAudioTrack(audiotrack);
        }
        
        //Regular call
        else{ 
            Log.success(`Incoming Call: ${callId}`);
            let videotrack = localStream.getVideoTracks()[0];
            let audiotrack = localStream.getAudioTracks()[0];   
            call.replaceLocalVideoTrack(videotrack);
            call.replaceLocalAudioTrack(audiotrack);
        }
        
        
    }

    function onCallHangup({ callId }) { 
        if(!callId)
            return console.error("No call");

        delete streams[callId];
        setStreams(Object.assign({}, streams));

        Log.warn(`Call ${callId} hangup`);
    }
    
    function onCallClosed({ call }) {
        if(!call)
            return console.error("No call");
        
        const callId = call.callId;

        Log.warn(`Call ${callId} closed`);
        delete streams[callId];
        setStreams(Object.assign({}, streams));
    }

    function doUpgradeToLive(mediaHubCallId, forwardingCallId) {
        liveCalls[mediaHubCallId] = forwardingCallId;
        liveCalls = Object.assign({}, liveCalls);
        window.liveCalls = liveCalls;
        setLiveCalls( liveCalls );
    }


    if (!roomInfo) return <V404 title={`Room '${roomId}' does not exist`} description='some description' />;

    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${user.id}`}</title>
        </Helmet>

        <ForwardStreamModal show={showModal} setShow={setShowModal} callback={doUpgradeToLive} />

        <Container id="room" className="text-center" fluid="lg" >
            {/*<h1 id="title" style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}></h1>*/}
            <h1 id="title" className='pt-3'>
                <Button as={Link} to='/' size='sm' variant="outline-light" >
                    <i className="bi bi-box-arrow-left" style={{ position: 'relative', top: '-2px', fontSize: 'x-large' }} />
                </Button>
                #{roomId}
            </h1>

            <Row style={{ height: "100%" }}>

                {streams && Object.entries(streams).length >= 0 && <Col id="otherstreams" xs={12} md={"3"} style={{}}>
                    <Row xs={12}>
                        {Object.entries(streams).map((v, k, a) => {
                            if (!rtcClient.getCalls()[v[0]])
                                return null;

                            let { calleeId, callerId } = rtcClient.getCalls()[v[0]];
                            let id = (calleeId === user.id) ? callerId : calleeId;
                                    
                            return <Col key={k} className='p-1'> <Video user={user} master={roomInfo.master} id={id} key={id} stream={v[1]} playsInline setLiveCallback={() => { setShowModal( v[0] ); }} /></Col>
                        })}
                    </Row>
                </Col>}

                <Col id="mainstream" xs={{ order: 'last' }} sm={{ order: 'first' }}>
                    <div className="m-auto align-self-center">
                        <Video user={user} master={roomInfo.master} id={'local'} key={-1} stream={localStream} local playsInline />
                    </div>
                </Col>
            </Row>
        </Container>
    </>)
}