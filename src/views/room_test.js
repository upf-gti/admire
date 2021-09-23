//React and 3rd party stuff
import Helmet from 'react-helmet';
import { useEffect, useState, useContext } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';

//Components, CSS & Views
import "./room.scss";
import V404 from 'views/v404';
import Video from 'components/video';
import StreamButton from 'components/streamButton';

//Dependencies
import { ToastContext } from 'components/toasts';
import { StreamSettings } from 'components/streamSettings';
import { rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';

function getRoom(roomId){
    return new Promise((resolve, reject) => {
        function success(data) {
            appClient.off('get_room_response', success);
            const { id, status, description, roomInfos } = data;

            if (data?.status === 'error')
                reject(false);
            else resolve(data);
        }

        appClient.on('get_room_response', success);
        appClient.getRoom();
    });
}

function isUserInRoom(roomId, userId) {
    return new Promise((resolve, reject) => {
        function success(data) {
            appClient.off('get_rooms_response', success);
            const { id, status, description, roomInfos } = data;

            const isInRoom = ([...roomInfos[roomId]?.guests ?? [], roomInfos[roomId]?.master].filter(v => v !== userId).length);

            if (data?.status === 'error' || !isInRoom) {
                reject(false);
                return;
            }

            resolve(data);
        }

        appClient.on('get_rooms_response', success);
        appClient.getRooms(roomId);
    });
}

function async callUser(userId){

}

function async callUsersInRoom(roomId) {
    const roomInfo = await getRoom(roomId);
    let stream = dummyStream.getStream();//localStream;// ?? dummyStream.getStream();
    let users = [...roomInfo.guests, roomInfo.master].filter((v, k, a) => { return v !== user.id });
    for (let user of users)
        rtcClient.call(user, stream)
}

function joinRoom(roomId) {
    return new Promise((resolve, reject) => {
        function success(data) {
            appClient.off('join_room_response', success);
            if (data?.status === 'error') reject(data);
            else resolve(data);
        }
        appClient.on('join_room_response', success);
        appClient.joinRoom(roomId);
    });

}

function windowUnload() {
    appClient.leaveRoom();
}



export default function Room({ user, setNavItems }) {

    //Other stuff
    let history = useHistory();
    const Log = useContext(ToastContext);
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream] } = useContext(StreamSettings);

    //Params
    let { roomId } = useParams();
    let [state, setState] = useState(0);
    let [streams, setStreams] = useState({});
    let [forwardStreams, setForwardStreams] = useState({});
    let [selectedStream, setSelectedStream] = useState('local');
    const [audioEnabled, setAudio] = useState(settings && settings.audio && settings.audio !== 'None');
    const [videoEnabled, setVideo] = useState(settings && settings.video && settings.video !== 'None');

    //Functions
    function forcerefresh() {
        setState(state + 1)
        setTimeout(forcerefresh, 2000);
    }

    async function onMount() {
        if (!roomId)
            return;

        if (! await isUserInRoom(roomId, user.id))
            await joinRoom(roomId)
            .catch(({ status, description, userId, userType, channels }) => { Log.error(`Error onJoinRoom ${description}`); history.push('/room-not-found'); })
            .then(({ status, description, userId, userType, channels }) => { Log.success(`Joined to room ${roomId}`); })
            .then()

        window.addEventListener('unload', windowUnload);
        
        rtcClient.on("incoming_call", onIncomingCall);
        rtcClient.on("call_opened", onCallOpened);
        rtcClient.on("call_response", onCallResponse);
        rtcClient.on('call_closed', onCallClosed);
        rtcClient.on('user_hangup', onCallHangup);

        forcerefresh();
    }

    function unMount() {
        window.removeEventListener('unload', windowUnload);
        Object.keys(rtcClient.getCalls()).forEach(callId => rtcClient.hangup(callId));
        appClient.leaveRoom();
    }

    //Execution
    useEffect(() => { onMount(arguments); return unMount(arguments) }, [roomId]);

    const calls = rtcClient.getCalls();
    const stream_entries = Object.entries(streams);

    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${user.id}`}</title>
        </Helmet>

        <Container id="room" className="text-center" fluid >
            <h1 id="title" className='pt-3'>#{roomId}</h1>
            <Row style={{ height: "100%" }}>
                <Col id="otherstreams" xs={12} md={"3"} style={{}}>
                    {stream_entries.length >= 0 &&
                        <Row xs={12}>
                            {stream_entries.map(({ callId, stream }, k, a) => {
                                if (!calls[callId])
                                    return null;

                                const { calleeId, callerId } = calls[callId];
                                const id = (calleeId === user.id) ? callerId : calleeId;

                                return <Col key={k} className='p-1'> <Video user={user} id={id} key={id} stream={stream} playsInline /></Col>
                            })}
                        </Row>
                    }
                </Col>

                <Col id="mainstream" xs={{ order: 'last' }} sm={{ order: 'first' }}>
                    <div className="m-auto align-self-center">
                        <Video user={user} id={'local'} key={-1} stream={localStream} local playsInline />
                    </div>

                    <div className='footer' style={{ zIndex: 1000, textAlign: 'center' }}>
                        <StreamButton key={0}
                            devices={devices?.video}
                            title={<i className={`bi bi-camera-video${videoEnabled ? '' : '-off'}-fill`} />}
                            onSelectCallback={(option, set) => { mediaAdapter.setVideo(option.getAttribute("value")); }}
                            onClickCallback={() => localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; setVideo(track.enabled); })}
                            />

                        <StreamButton key={1}
                            devices={devices?.audio}
                            title={<i className={`bi bi-mic${audioEnabled ? '' : '-mute'}-fill`} />}
                            onSelectCallback={(option, set) => { mediaAdapter.setAudio(option.getAttribute("value")); }}
                            onClickCallback={() => localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; setAudio(track.enabled); })}
                            />
                    </div>
                </Col>
            </Row>
        </Container>
    </>);
}