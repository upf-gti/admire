import { useState, useEffect, useRef } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import RoomList from 'components/roomlist';

export default function Lobby({user, setLogin}) {

    const [rooms, setRooms] = useState(null);
    const roomIdRef = useRef(null);

    useEffect(() => {
            appClient.on("logout_response",      onLogOut);
            appClient.on('get_rooms_response',   onGetRooms);
            appClient.on('create_room_response', onCreateRoom);
            appClient.getRooms();
        return () => {
            appClient.off("logout_response",      onLogOut);
            appClient.off('get_rooms_response',   onGetRooms);
            appClient.off('create_room_response', onCreateRoom);
        }
    }, []);
    
    function doLogOut(){
        appClient.logout();
    }

    function onLogOut(){
        setLogin(null);
    }

    function doCreateRoom()
    {
        console.log('create room');
        appClient.createRoom(roomIdRef.current.value);
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
        <button onClick={doLogOut}> Logout </button>
        { user.type !== "0" && <input ref={roomIdRef} placeholder='roomId'/> }
        { user.type !== "0" && <button onClick={doCreateRoom}> new room </button> }
        {rooms && <RoomList rooms={rooms}/>}
    </>);
}