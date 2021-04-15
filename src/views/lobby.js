import { useState, useEffect, useRef } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import Navbar from 'components/nav';
import RoomList from 'components/roomlist';

export default function Lobby({user, setLogin, setNavItem}) {

    const [rooms, setRooms] = useState(null);
    const roomIdRef = useRef(null);

    useEffect(() => {
            console.log('A');
            setNavItem('New Room +', <li>hola</li>);
            appClient.on('get_rooms_response',   onGetRooms);
            appClient.on('create_room_response', onCreateRoom);
            appClient.getRooms();
        return () => {
            setNavItem('New Room +', null);
            appClient.off('get_rooms_response',   onGetRooms);
            appClient.off('create_room_response', onCreateRoom);
        }
    }, [user]);
    
    function doCreateRoom()
    {
        console.log('create room');
        appClient.createRoom(roomIdRef.current.value);
        //document.location(`/rooms/${roomIdRef.current.value}`);
    }

    function onCreateRoom(event)
    {
        
        switch(event.status)
        {
            case 'ok': appClient.getRooms(); break;
            case 'error': 
                const {id : title, status: type, description} = event;
                console.error(description);
                //TODO: fire an error toast
            break;
        }
    }

    function onGetRooms(event)
    {
        if(event.status === 'error') return;
        setRooms(Object.values(event.roomInfos ?? null));
    }

    return (<>
        <h2>Lobby</h2>
        
        { user.type !== "0" && <input ref={roomIdRef} placeholder='roomId'/> }
        { user.type !== "0" && <button onClick={doCreateRoom}> new room </button> }
        {rooms && <RoomList rooms={rooms}/>}
    </>);
}