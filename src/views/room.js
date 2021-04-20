import { useState, useEffect } from 'react';
import { Row } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import V404 from 'views/v404';

export default function Room({setNavItems})
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

        }
    }, [roomId]);    

    function onGetRooms(event)
    {
        const validated = event.roomInfos.hasOwnProperty(roomId);
        setValid( validated );
        appClient.joinRoom(roomId);
    }

    function onJoinRoom(event)
    {
        setFetching(false);

        switch(event.satus)
        {
            case "ok": 
            //TODO: Launch success toast
            console.error('success', event.description);
            break;

            case "error": 
            //TODO: Launch error toast
            console.error('error', event.description);
            break;
        }
    }

    if(fetching) 
        return <></>;
    if(!valid) 
        return <V404 title='Room does not exist' description='some description'/>;
    
    return (<>
        <Row id="title" className="m-auto align-self-center" >{/*Title*/}
            <h1 style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}>#{roomId}</h1>
        </Row>
    </>)
}