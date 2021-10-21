import Helmet from 'react-helmet';
import { useParams, useHistory, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useReducer, useContext } from 'react';
import { RTCEvent, rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';
import { Container, Row, Col, Button, Modal, Form, OverlayTrigger, SplitButton, Dropdown, ButtonGroup, Badge } from 'react-bootstrap';

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

    window.localStream = localStream;

    useEffect(() => {//Executes when this component is mounted
        let onGuestJoin, onGuestLeft, onMasterLeft, onUnload, onGetRoom;
        appClient.on('get_room_response', onGetRoom    = ({ roomInfo }) => {
            if(roomInfo)    setRoomInfo(Object.assign({}, roomInfo));
            else            setRoomInfo(null);
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
            const isOk = rtcClient.call(user, ({callId, status, description}) => {
                if(status === 'error')
                    Log.error(`Call response error: ${description}`);
            })

            if (!isOk)
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
        window.streams = streams;
        //Live call
        const forwardingCallId = liveCalls[callId];
        if (forwardingCallId) {

            console.log("forward call")
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
            console.log("regular call")
            Log.success(`Incoming Call: ${callId}, callerId: ${call.callerId}, calleeId: ${call.calleeId} `);
            let videotrack = localStream.getVideoTracks()[0];
            let audiotrack = localStream.getAudioTracks()[0];
            call.replaceLocalVideoTrack(videotrack);
            call.replaceLocalAudioTrack(audiotrack);

            //if(!selected)setSelected(callId);
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
    
    if(!!selected && !streams[selected])
        setSelected(null);
    
    if (!roomInfo) return <V404 title={`Room '${roomId}' does not exist`} description='some description' />;
    let clients = Object.entries(Object.assign({ local: localStream }, streams));
    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${user.id}`}</title>
        </Helmet>
        <ForwardStreamModal show={showModal} setShow={setShowModal} callback={doUpgradeToLive} />

        <Container id="room" className="text-center" fluid >
        <Row id="content-row" className="p-1" style={{ height:"100%" }}>

            <Col id="main-video-col" className="p-0" >
                <Video id={getUserId(selected)} stream={streams[selected] ?? localStream} local={(streams[selected] ?? localStream) === localStream} />
                <Col id="stream-controls">
                    <DeviceButton icon_enabled="bi-mic-fill"          icon_disabled="bi-mic-mute-fill"          tracks={localStream?.getAudioTracks() ?? []} selected={settings?.audio ?? "None"} options={devices?.audio ?? []} onClick={forcerefresh} onSelect = { (v) => mediaAdapter.setAudio(v) } />
                    <DeviceButton icon_enabled="bi-camera-video-fill" icon_disabled="bi-camera-video-off-fill"  tracks={localStream?.getVideoTracks() ?? []} selected={settings?.video ?? "None"} options={devices?.video ?? []} onClick={forcerefresh} onSelect = { (v) => mediaAdapter.setVideo(v) } />
                    <Button as={Link} to='/' size='lg' variant="danger" children={<i className="bi bi-telephone-x-fill"/> }/>
                </Col>
            </Col>
            
            <Col id="carousel-col" xs="auto" className="p-0" >
                <div id="carousel">
                    {clients.map(([callId, stream],k) => {
                            if(liveCalls[callId] !== undefined)
                                return<></>;

                            let id = getUserId(callId);
                            let imTheMaster = user.id === roomInfo?.master;
                            let [mediaHubCallId, forwardedCallId] = Object.entries(liveCalls).find( v => v[1] === callId ) ?? [null,null];
                            let isForwardCall = !!forwardedCallId;
                            
                            return <div key={k}>
                                <div className="stream-forward">
                                    { imTheMaster && (!isForwardCall && id !== roomInfo?.master && id !== user.id) && <Badge pill bg="danger" onClick={() => setShowModal( callId )}><i class="bi bi-cast"></i></Badge> }
                                    { imTheMaster && ( isForwardCall && id !== roomInfo?.master && id !== user.id) && <Badge pill bg="danger" onClick={() => rtcClient.hangup( mediaHubCallId )}><i class="bi bi-x"></i></Badge> }
                                    { (selected === callId || (!selected && k === 0)) && <Badge pill bg="primary"><i className="bi bi-eye active"/></Badge> }
                                </div>
                                <Video id={id} stream={stream} local={ stream === localStream} onClick={() => { setSelected(selected===callId?null:callId) }}/>
                            </div>
                    })}
                </div>
            </Col>

         
            
        </Row>
        </Container>

        <style global jsx>{` 
            @import 'variables.scss';
            #room{
    
                color:white;
                height: 100vh;
                .Video{
                    video{
                        height: 100%;
                        width:100%;
                    }
                    &:hover{
                        background-size: contain;
                    }

                    .bi::before{
                        margin:0;
                        margin-top:1px;
                        margin-bottom: 2px;
                    }
                }

                #content-row{
                    height:100%;
                }

                #main-video-col {
                    height: 100%;
                    overflow: hidden;
                    //background: magenta;

                    .Video
                    {
                        width:100%;
                        height:100%;
                        object-fit: cover;
                    }
                }
                
                #stream-controls {
                    //background:rgba(255, 166, 0, 0.171); 
                    width:100%; 
                    height:60px; 
                    //width: calc( 100% - 166px - .5rem ); 
                    transform: translateY(-100%) !important;
                    margin-bottom:.5em;

                    margin-top: -60px; 
                    //position: absolute; 
                    //bottom: .5rem;
                }

                .stream-forward{
                    height:1.9rem;
                    position:relative;
                    margin-bottom:-1.9rem;
                    text-align:left;
                    padding:3px 6px;
                    z-index:10000;

                    .badge{
                        cursor:pointer;
                        padding:.44em .45em;
                    }
                }

                #carousel-col {
                    height: 100%;
                    width:166px;
                    overflow-x: hidden;
                    overflow-y: scroll;
                }

                #carousel {
                    display: flex;
                    flex-direction: column;
                    .Video, .Video video{ 
                        width: 166px; 
                        height:124px; 
                        object-fit: cover;
                    }
                }

                @media (orientation: landscape){}
                @media (orientation: portrait){
                    #content-row{ flex-direction: column-reverse; }
                    #main-video-col{width:100%;}
                    #stream-controls{width:100%;}
                    #carousel-col{ 
                        width:100%; height:124px; 
                        overflow-x: scroll;
                        overflow-y: hidden;
                    }
                    #carousel .Video{
                        height:100%;
                    }

                    #carousel{ flex-direction: row;}
                }

                
            }

        `}</style>
    </>)
}