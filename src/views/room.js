import Helmet from 'react-helmet';
import { useParams, useHistory, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useReducer, useContext } from 'react';
import { RTCEvent, rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';
import { Container, Row, Col, Button, Modal, Form, OverlayTrigger, SplitButton, Dropdown, ButtonGroup, Badge } from 'react-bootstrap';

import "./room.scss";
import V404 from 'views/v404';
import Video from 'components/video';
import DeviceButton from 'components/deviceButton';
import ForwardStreamModal from 'components/forwardStreamModal';

import { StreamSettings } from 'components/streamSettings';
import { Toasts, ToastContext } from 'components/toasts';

export default function Room({ user, setNavItems }) {
    //Params    
    let [state, setState]         = useState(0);
    let [showModal, setShowModal] = useState(null);
    let [selected, setSelected]   = useState(null);
    let [streams, setStreams]     = useReducer((value, newvalue) => { forcerefresh(); return newvalue; }, {});
    let [roomInfo, setRoomInfo]   = useReducer((value, newvalue) => { forcerefresh(); return newvalue; }, null);
    let [liveCalls, setLiveCalls] = useReducer((value, newvalue) => { forcerefresh(); return newvalue; }, {});

    //Retrieved from URL
    const Log = useContext(ToastContext);
    let { roomId } = useParams();

    //Other stuff
    let history = useHistory();
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream] } = useContext(StreamSettings);

    useEffect(() => {//Executes when this component is mounted
        let onGuestJoin, onGuestLeft, onMasterLeft, onUnload, onGetRoom;
        appClient.on('get_room_response', onGetRoom    = ({ roomInfo }) => {
            console.log(roomInfo);
            if(roomInfo)
                setRoomInfo(Object.assign({}, roomInfo));
            else
                setRoomInfo(null);
        });
        appClient.on('guest_left_room',   onGuestLeft  = (message) => { Log.warn('Guest left'); appClient.getRoom(); }); //
        appClient.on('master_left_room',  onMasterLeft = (message) => { Log.warn('Master left'); /* modal master left, on ok return lobby*/ history.push('/') });  //Tal vez estos tres podrian devolver la info de la room 
        appClient.on('guest_joined_room', onGuestJoin  = (message) => { Log.info('Guest joined'); appClient.getRoom(); });  //asi no lo he de pedir cada vez.

        rtcClient.on(RTCEvent.IncomingCall, onIncomingCall);
        rtcClient.on(RTCEvent.CallOpened, onCallOpened);
        rtcClient.on(RTCEvent.CallClosed, onCallClosed);
        rtcClient.on(RTCEvent.UserHangup, onUserHangup);

        //This is to be sure when user is leaving the room because a refresh/closing/leaving the tab
        document.body.addEventListener('unload', onUnload = (e) => { appClient.leaveRoom(); });

        (async function () {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            roomInfo = await validateRoom(roomId);
            if (!roomInfo) {
                Log.error(`Room ${roomId} does not exist.`);
                history.push('/');
            };
            setRoomInfo(roomInfo);

            //If we are not already in the room, join it
            if ([...roomInfo.guests ?? [], roomInfo.master].filter(v => v !== user.id).length) {
                await joinRoom(roomId)
                    .catch(e => {
                        Log.error(e);
                        history.push('/');
                    });
            }

            callUsers();
            forcerefresh();
            document.addEventListener('resize', forcerefresh);
        })();

        return () => {//Executes on dismount
            appClient.off('get_room_response', onGetRoom);
            appClient.off('master_left_room', onMasterLeft);
            appClient.off('guest_joined_room', onGuestJoin);
            appClient.off('guest_left_room', onGuestLeft);

            rtcClient.off(RTCEvent.IncomingCall, onIncomingCall);
            rtcClient.off(RTCEvent.CallOpened, onCallOpened);
            rtcClient.off(RTCEvent.CallClosed, onCallClosed);
            rtcClient.off(RTCEvent.UserHangup, onUserHangup);

            window.removeEventListener('unload', onUnload);

            Object.keys(rtcClient.getCalls()).forEach(callId => rtcClient.hangup(callId));
            appClient.leaveRoom();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    function forcerefresh() {
        setState(state + 1);
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
                if (data?.status === 'error') {
                    reject(`Error onJoinRoom ${data?.description}`);
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
        if (!roomInfo) return;
        let users = [...roomInfo.guests, roomInfo.master].filter((v, k, a) => { return v !== user.id });
        for (let user of users) {
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

        streams[callId] = stream;
        setStreams(streams);

        //Live call
        const forwardingCallId = liveCalls[callId];
        if (forwardingCallId) {

            const forward_stream = streams[forwardingCallId];
            if (!forward_stream) {
                rtcClient.hangup(callId);
                return Log.error(`Live Call Error: ${callId}, callerId: ${call.callerId}, calleeId: ${call.calleeId} `);;
            }

            Log.success(`Live Call: ${callId}, callerId: ${call.callerId}, calleeId: ${call.calleeId} `);
            let videotrack = forward_stream.getVideoTracks()[0];
            let audiotrack = forward_stream.getAudioTracks()[0];
            call.replaceLocalVideoTrack(videotrack);
            call.replaceLocalAudioTrack(audiotrack);
        }

        //Regular call
        else {
            Log.success(`Incoming Call: ${callId}, callerId: ${call.callerId}, calleeId: ${call.calleeId} `);
            let videotrack = localStream.getVideoTracks()[0];
            let audiotrack = localStream.getAudioTracks()[0];
            call.replaceLocalVideoTrack(videotrack);
            call.replaceLocalAudioTrack(audiotrack);

            if (!selected)
                setSelected(callId);
        }
    }

    function onUserHangup({ callId }) {
        if (!callId)
            return console.error("No call");

        manageLiveCallClosed(callId);
        delete streams[callId];
        setStreams(streams);

        Log.warn(`Call ${callId} hangup`);
    }

    function onCallClosed({ call }) {
        if (!call)
            return console.error("No call");

        const callId = call.callId;
        manageLiveCallClosed(callId);

        delete streams[callId];
        setStreams(streams);
        Log.warn(`Call ${callId} closed`);
    }

    function manageLiveCallClosed(callId) {
        let result = null;
        for (const [mId, fId] of Object.entries(liveCalls)) {
            if (callId !== mId && fId !== callId)
                continue;

            result = [mId, fId];
            break;
        }

        if (result) {
            const [mediaHubCallId, forwardedCallId] = result;
            delete liveCalls[mediaHubCallId];
            setLiveCalls(liveCalls);
        }
    }

    function doUpgradeToLive(mediaHubCallId, forwardingCallId) {
        if (!mediaHubCallId || !forwardingCallId)
            return console.error(`mediahubcallid or forwardcallid are undefined`);
        liveCalls[mediaHubCallId] = forwardingCallId;
        setLiveCalls(liveCalls);
    }

    function getUserId(callId){
        let id = user.id;
        let call = rtcClient.getCalls()[callId];
        if (callId !== "local" && call) {
            let { calleeId, callerId } = call;
            id = (calleeId === user.id) ? callerId : calleeId;
        }
        return id;
    }
    
    let clients = Object.entries(Object.assign({ local: localStream }, streams));
    if (!roomInfo) return <V404 title={`Room '${roomId}' does not exist`} description='some description' />;
    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${user.id}`}</title>
        </Helmet>
        <ForwardStreamModal show={showModal} setShow={setShowModal} callback={doUpgradeToLive} />

        <Container id="room" className="text-center" fluid >
        <Row id="content-row" className="p-1" style={{ height:"100%" }}>

            <Col id="main-video-col" className="p-0" >
                    
                <Video id={getUserId(selected)} stream={streams[selected] ?? localStream} local={selected === "local"} onForward={ (getUserId(selected) !== roomInfo?.master && selected !== "local")? () => { setShowModal( selected ); } : null }/>

                <Col id="stream-controls">
                    <DeviceButton icon_enabled="bi-mic-fill"          icon_disabled="bi-mic-mute-fill"          tracks={localStream?.getAudioTracks() ?? []} selected={settings?.audio ?? "None"} options={devices?.audio ?? []} onClick={forcerefresh} onSelect = { (v) => mediaAdapter.setAudio(v) } />
                    <DeviceButton icon_enabled="bi-camera-video-fill" icon_disabled="bi-camera-video-off-fill"  tracks={localStream?.getVideoTracks() ?? []} selected={settings?.video ?? "None"} options={devices?.video ?? []} onClick={forcerefresh} onSelect = { (v) => mediaAdapter.setVideo(v) } />
                    <Button as={Link} to='/' size='lg' variant="danger" children={<i className="bi bi-telephone-x-fill"/> }/>
                </Col>
            </Col>
            
            <Col id="carousel-col" xs="auto" className="p-0" >
                <div id="carousel">
                    {clients.map(([callId, stream],k) => {
                            let id = getUserId(callId);

                            return <Video 
                                    id={id}
                                    key={k} 
                                    stream={stream} 
                                    local={callId === "local"} 
                                    active={selected === callId}
                                    onClick={() => { setSelected(selected===callId?null:callId) }}
                                    onForward={ (id !== roomInfo?.master && id !== user.id)? () => { setShowModal( callId ); } : null }
                            />
                    })}
                </div>
            </Col>

         
            
        </Row>
        </Container>

    </>)
}