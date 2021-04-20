import { Container, Card, Button, Modal, Form } from 'react-bootstrap';
import { useState, useEffect, useRef } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import Navbar from 'components/nav';
import RoomList from 'components/roomlist';

import "./lobby.scss";

export default function Lobby({user, setLogin, setNavItem}) {
    const [showModal, setShowModal] = useState(false);
    const [rooms, setRooms] = useState(null);
    const roomIdRef = useRef(null);

    useEffect(() => {
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

    <Modal id="create-room-modal" centered show={showModal} onHide={()=>setShowModal(false)}>
        <Modal.Header closeButton>
            <Modal.Title>Create new teleporting room</Modal.Title>
        </Modal.Header>

        <Modal.Body>
            <Form.Group className="mb-2" controlId="formCreateRoomID">
                <Form.Control  size="lg" ref={roomIdRef} placeholder='roomId' />
            </Form.Group>

        </Modal.Body>

        <Modal.Footer className="text-center">
            <Button variant="outline-secondary" >Cancel</Button>
            <Button variant="outline-primary" onClick={doCreateRoom} >Proceed!</Button>
        </Modal.Footer>
    </Modal>

    <Container fluid id="lobby" className="text-center">
        <h3 id="title">Lobby:</h3>

        { rooms && <RoomList rooms={rooms}/> }
        
        <div id="footer">
            {user.type !== "0" && <Button onClick={()=>setShowModal(true)}> <i className="bi bi-plus"/> New Room </Button>}
        </div>
    </Container>
    </>);
}