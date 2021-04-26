import Helmet from 'react-helmet';
import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import "./room.scss";
import V404 from 'views/v404';
import VideoStream from 'components/videostream';

export default function Room({user, setNavItems})
{
    //References for view elements
    let localVideo                      = useRef(null);

    //Retrieved from URL
    const { roomId }                      = useParams();

    //Room view properties
    const [ready, setReady ]              = useState(false);
    const [valid, setValid ]              = useState(null);
    const [fetching, setFetching ]        = useState(null);

    //Stream properties that should change the view;
    const [callId,      setCallId]        = useState(true);
    const [video,       setVideo]         = useState(true);
    const [audio,       setAudio]         = useState(true);
    const [stream,      setStream]        = useState(true);
    const [resolution,  setResolution]    = useState(true);

    const [devices, setDevices]           = useState(null);
    const [settings, setSettings]         = useState(null);
    const [resolutions, setResolutions]   = useState(null);







    useEffect(() => {
        let onGetRooms, onJoinRoom, onMasterLeft, onGuestJoined, onGuestLeft;
            appClient.on('get_rooms_response',  onGetRooms      = ( { id, status, roomInfos }) => { if(roomInfos.hasOwnProperty(roomId)){
                                                                        setValid(true);
                                                                        (roomInfos[roomId].master === user.id) 
                                                                        ? setReady(true)
                                                                        : appClient.joinRoom(roomId);

                                                                    }});
            appClient.on('join_room_response',  onJoinRoom      = ({status, description, userId, userType})=>{ setFetching(false); });
            //appClient.on('master_left',         onMasterLeft    = ()=>{});
            //appClient.on('guest_joined',        onGuestJoined   = ()=>{});
            //appClient.on('guest_left',          onGuestLeft     = ()=>{});
            appClient.getRooms();
            setFetching(true);

            let onGotDevices, onErrorDevices, onGotResolutions, onGotStream, onErrorStream;
            mediaAdapter.on("got_devices",      onGotDevices        = ( {devices,settings})=>{ setDevices(devices); setSettings(settings); });
            mediaAdapter.on("error_devices",    onErrorDevices      = ( {description})=>console.error("Media devices error:", description));
            mediaAdapter.on("got_resolutions",  onGotResolutions    = ( {resolutions})=>setResolutions(resolutions));
            mediaAdapter.on("got_stream",       onGotStream         = ( {stream, settings})=>{ 
                                                                            if(!localVideo || !localVideo.current ) return;
                                                                                localVideo.current.srcObject = stream;
                                                                            //setStream(stream); 
                                                                            //setAudio(settings.audio); 
                                                                            //setVideo(settings.video); 
                                                                            //setResolution(settings.resolution); 
                                                                            
                                                                            //rtcClient.replaceStream(callId, stream);
                                                                        });
            mediaAdapter.on("error_stream",     onErrorStream       = ( {description})=>console.error("Stream error:", description));
            mediaAdapter.start();
        return () => {
            appClient.off('get_rooms_response', onGetRooms);
            appClient.off('join_room_response', onJoinRoom);
            appClient.leaveRoom();

            mediaAdapter.off("got_devices",      onGotDevices      ); 
            mediaAdapter.off("error_devices",    onErrorDevices    );
            mediaAdapter.off("got_resolutions",  onGotResolutions  );
            mediaAdapter.off("got_stream",       onGotStream       );
            mediaAdapter.off("error_stream",     onErrorStream     );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);    

    if(fetching) return <></>;
    if(!valid)   return <V404 title={`Room ${roomId} does not exist`} description='some description'/>;
    
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
                
            </>)}

            {!ready && /*Preparation*/ (<> 
                <h1 style={{color:"white"}}>Preparation</h1>
                <VideoStream local devices={devices} settings={settings} fref={localVideo}/>
            </>)}

        </Col>
        </Row>
    </Container>
    </>)
}