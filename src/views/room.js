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
            appClient.getRooms();
            setFetching(true);
        return () => {
            appClient.off('get_rooms_response',   onGetRooms);
        }
    }, [roomId]);    

    function onGetRooms(event)
    {
        const validated = event.roomInfos.hasOwnProperty(roomId);
        setValid( validated );
        setFetching(false);
    }
    if(fetching) 
        return <></>;
    if(!valid) {
        return <V404 title='Room does not exist' description='some description'/>;
    }
    return (<>
        <Row id="title" className="m-auto align-self-center" >{/*Title*/}
            <h1 style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}>#{roomId}</h1>
        </Row>
    </>)
}