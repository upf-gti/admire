import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import V404 from 'views/v404';

export default function Room()
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
        <h1>Room {roomId}</h1>
    </>)
}