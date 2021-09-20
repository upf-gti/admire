import Helmet from 'react-helmet';
import { useState, useEffect, useRef, useContext } from 'react';
import { Container, Row, Col, Button, Modal, Form, OverlayTrigger } from 'react-bootstrap';
import { useParams, useHistory, Link } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';

import "./room.scss";
import V404 from 'views/v404';
import Video from 'components/video';
import VideoStream from 'components/videostream';
import { StreamSettings } from 'components/streamSettings';
import { Toasts, ToastContext } from 'components/toasts';



export default function Room({ user, setNavItems }) {
    let history = useHistory();
    const Log = useContext(ToastContext);
    //All stream properties
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream] } = useContext(StreamSettings);

    //Retrieved from URL
    let { roomId } = useParams();
    let [state, setState] = useState(0);
    let [calls, setCalls] = useState(0);
    let [liveCallId, setLiveCallId] = useState(null);    

    function forcerefresh() {
        setState(state + 1)
        setTimeout(forcerefresh, 2000);
    }

    let livestreamRef = useRef(null);
    let [streams, setStreams] = useState({});
    let [forwardStreams, setForwardStreams] = useState({});

    let [roomInfo, setRoomInfo] = useState(null);
    let [selected, setSelected] = useState('local');
    let [showModal, setShowModal] = useState(null);

    //let   [ users,        setUsers ]        = useState( [] );
    //const [ settings,     setSettings ]     = useState(null);
    //const [ resolutions,  setResolutions ]  = useState(null);
    //const [ audioDevices, setAudioDevices ] = useState(null);
    //const [ videoDevices, setVideoDevices ] = useState(null);

    useEffect(() => {//Executes when this component is mounted
        console.log('mount');
        let onGuestJoin, onGuestLeft, onMasterLeft, onGetRooms;
        appClient.on('join_room_response', onJoinRoom);
        appClient.on('get_rooms_response', onGetRooms = ({ id, status, description, roomInfos }) => { setRoomInfo(Object.assign({}, roomInfos[roomId])); });
        appClient.on('master_left_room', onMasterLeft = (message) => { Log.warn('Master left'); /* modal master left, on ok return lobby*/history.push('/') }); //Tal vez estos tres podrian devolver la info de la room 
        appClient.on('guest_joined_room', onGuestJoin = (message) => { Log.info('Guest joined'); appClient.getRooms(); }); //asi no lo he de pedir cada vez.
        appClient.on('guest_left_room', onGuestLeft = (message) => { Log.warn('Guest left'); appClient.getRooms(); }); //

        rtcClient.on("incoming_call", onIncomingCall);
        rtcClient.on("call_opened", onCallOpened);
        rtcClient.on("call_response", onCallResponse);
        rtcClient.on('call_closed', onCallClosed);
        rtcClient.on('user_hangup', onCallHangup);

        //This is to be sure when user is leaving the room because a refresh/closing/leaving the tab
        let onBeforeUnload, onUnload;
        //window.addEventListener('beforeunload', onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; });
        window.addEventListener('unload', onUnload = (e) => { appClient.leaveRoom(); });

        //Validate the room exists before joining // do we really need this?
        let validationCallback;
        appClient.getRooms();
        appClient.on('get_rooms_response', validationCallback = ({ id, status, description, roomInfos }) => {
            appClient.off('get_rooms_response', validationCallback);
            roomInfo = roomInfos[roomId];
            setRoomInfo(Object.assign({}, roomInfos[roomId]));
            if (!roomInfos[roomId]) {
                Log.error("No RoomInfo");
                history.push("/");
                //window.location = '/';//Todo: como leches hago esto
                return;
            }

            if ([...roomInfos[roomId].guests, roomInfos[roomId].master].filter(v => v !== user.id).length)
                appClient.joinRoom(roomId);

        });

        forcerefresh();

        return () => {//Executes on dismount
            Log.warn('room dismount');
            appClient.off('get_rooms_response', onGetRooms);
            appClient.off('join_room_response', onJoinRoom);
            appClient.off('master_left_room', onMasterLeft);
            appClient.off('guest_joined_room', onGuestJoin);
            appClient.off('guest_left_room', onGuestLeft);

            rtcClient.off('incoming_call', onIncomingCall);
            rtcClient.off('call_opened', onCallOpened);
            rtcClient.off('call_closed', onCallClosed);
            rtcClient.off("call_response", onCallResponse);
            rtcClient.off('user_hangup', onCallClosed);

            //window.removeEventListener('beforeunload', onBeforeUnload);
            window.removeEventListener('unload', onUnload);
            
            Object.keys(rtcClient.getCalls()).forEach(callId => rtcClient.hangup(callId));
            appClient.leaveRoom();

            console.log('dismount');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    function onJoinRoom({ status, description, userId, userType, channels }) {
        if (status === 'error') {
            Log.error(`Error onJoinRoom ${description}`);
            return;
        }

        if (!roomInfo) {
            Log.error("No RoomInfo");
            return;
        }

        Log.success(`Joined to room ${roomId}`);
        //if(status === 'error') return console.error(status, description);

        let stream = dummyStream.getStream();//localStream;// ?? dummyStream.getStream();
        let users = [...roomInfo.guests, roomInfo.master].filter((v, k, a) => { return v !== user.id });

        for (let user of users) {
            Log.warn(`Attempting call to ${user}`);

            if (!rtcClient.call(user, stream))
                Log.error(`call missed to ${user}`);
        }
    }

    function onIncomingCall({ callId, callerId }) {
        Log.warn(`onIncomingCall`);
        let stream = dummyStream.getStream();// localStream;// ?? dummyStream.getStream();
        Log.info(stream.id);
        rtcClient.acceptCall(callId, stream);
        setState(state + 1);
    }

    function onCallResponse(message) {
        Log.success(`onCallResponse`);
        console.log(message)
    }

    function onCallOpened({ call, stream }) {
        const callId = call.callId;

        Log.success(`Call ${callId} started`);

        window.streams = streams;

        streams[callId] = stream;
        console.log('el stream de adri es:', stream.id, 'el stream de her es:', localStream.id);

        setStreams(Object.assign({}, streams));
        
        const isForwardingHub = Object.entries(forwardStreams).some(
            ([forwardingCallId, mediaHubtarget]) => {
                if(mediaHubtarget !== call.calleeId) return false;

                //Entonces es la que acabo de forwardear al mediahub
                const forward_stream = streams[forwardingCallId];
                //Replace video and audio stream tracks
                let videotrack = forward_stream.getVideoTracks()[0];
                let audiotrack = forward_stream.getAudioTracks()[0];
                call.replaceLocalVideoTrack(videotrack);
                call.replaceLocalAudioTrack(audiotrack);

                return true;
            });
        
        if( !isForwardingHub ) //calleeid es mediahub?
        {
            //Replace video and audio stream tracks
            let videotrack = localStream.getVideoTracks()[0];
            let audiotrack = localStream.getAudioTracks()[0];
            call.replaceLocalVideoTrack(videotrack);
            call.replaceLocalAudioTrack(audiotrack);
        }
    }

    function onCallHangup({ callId }) { 
        if(!callId)
        {
            console.error("No call");
            return;
        }

        Log.warn(`Call ${callId} hangup`);
        delete streams[callId];
        setStreams(Object.assign({}, streams));
    }
    
    function onCallClosed({ call }) {
        if(!call)
        {
            console.error("No call");
            return;
        }
        
        const callId = call.callId;

        Log.warn(`Call ${callId} closed`);
        delete streams[callId];
        setStreams(Object.assign({}, streams));
    }

    function doUpgradeToLive() {
        if (!livestreamRef || !livestreamRef.current || !showModal) {
            console.error('livestreamref is null');
            return;
        }

        const [forwardingCallId, mediaHubtarget] = [showModal, livestreamRef.current.value];

        forwardStreams[forwardingCallId] = mediaHubtarget;
        setForwardStreams( Object.assign({}, forwardStreams) );

        if (!rtcClient.call(mediaHubtarget))
            Log.error(`call missed to backend ${user}`);
    }

    if (!roomInfo) return <V404 title={`Room '${roomId}' does not exist`} description='some description' />;

    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${user.id}`}</title>
        </Helmet>

        <Modal
            centered
            id="create-room-modal"
            show={showModal ? true : false}
            onHide={() => setShowModal(false)}
            aria-labelledby="contained-modal-title-vcenter"
            onKeyDown={(e) => {
                if (e.keyCode === 13)
                    doUpgradeToLive();
            }} tabIndex="0"
        >
            <Modal.Header>
                <Modal.Title> Send Peer to Live </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form.Group className="mb-2">
                    <Form.Control size="lg" ref={livestreamRef} placeholder='enter live Id' />
                </Form.Group>
            </Modal.Body>

            <Modal.Footer className="text-center">
                <Button variant="outline-secondary" onClick={() => setShowModal(false)} >Cancel</Button>
                <Button variant="outline-primary" onClick={doUpgradeToLive} >Proceed!</Button>
            </Modal.Footer>
        </Modal>

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