import Helmet from 'react-helmet';
import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import "./room.scss";
import V404 from 'views/v404';

export default function Room({user, setNavItems})
{
    const { roomId } = useParams();
    const [ valid, setValid ]       = useState(null);
    const [ fetching, setFetching ] = useState(null);
    
    useEffect(() => {
            appClient.on('get_rooms_response',    onGetRooms);
            appClient.on('join_room_response',    onJoinRoom);
            appClient.getRooms();
            setFetching(true);
        return () => {
            appClient.off('get_rooms_response',   onGetRooms);
            appClient.off('join_room_response',    onJoinRoom);
            appClient.leaveRoom();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);    

    function onGetRooms(event)
    {
        const validated = event.roomInfos.hasOwnProperty(roomId);
        setValid( validated );
        appClient.joinRoom(roomId);
    }

    function onJoinRoom(event)
    {
        const {status, description, userId, userType} = event;

        setFetching(false);

        switch(status)
        {
            case "ok": 
            //TODO: Launch success toast
            console.error('success', description);
            break;

            case "error": 
            //TODO: Launch error toast
            console.error('error', description);
            break;
            default:
                console.warn(status, description);
        }
    }

    if(fetching) 
        return <></>;
    if(!valid) 
        return <V404 title='Room does not exist' description='some description'/>;
    
    return (<>
        <Helmet>
            <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${ user.id }`}</title>
        </Helmet>
        
        <Container fluid="xs" id="lobby" className="text-center">
        <Row className="justify-content-md-center">
        <Col xs={12} lg={6} xl={4}>
            <h1 id="title" style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}>#{roomId}</h1>
        </Col>
        </Row>
    </Container>
    </>)
}