import Helmet from 'react-helmet';
import { Container, Card, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { useState, useEffect, useRef } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import RoomList from 'components/roomlist';

import "./lobby.scss";

export default function Lobby({user, setLogin, setNavItem}) {
    
    const roomIdRef = useRef(null);
    const [rooms, setRooms] = useState(null);
    const [fetching, setFetching] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
            setFetching(true);
            appClient.on('get_rooms_response',   onGetRooms);
            appClient.on('create_room_response', onCreateRoom);
            appClient.getRooms();
        return () => {
            appClient.off('get_rooms_response',   onGetRooms);
            appClient.off('create_room_response', onCreateRoom);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);
    
    function doCreateRoom()
    {
        console.log('create room');
        appClient.createRoom(roomIdRef.current.value);
        setShowModal(false);
        //document.location(`/rooms/${roomIdRef.current.value}`);
    }

    function onCreateRoom({id, status, description, roomId})
    {
        switch(status)
        {
            case 'ok': 
                //appClient.getRooms();
                document.location = `/rooms/${roomId}`;
            break;
            case 'error': console.error(status, description);
                //TODO: fire an error toast
            break;
            default: console.warn(status, description); break;

        }
    }

    function onGetRooms(event)
    {
        setFetching(false);
        if(event.status === 'error') return;
        setRooms(Object.values(event.roomInfos ?? null));
    }

    if(fetching) return <></>

    return (<>
    <Helmet>
        <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${ user.id }`}</title>
    </Helmet>
    <Modal 
        centered 
        id="create-room-modal" 
        show={showModal?true:false} 
        onHide={()=>setShowModal(false)}
        aria-labelledby="contained-modal-title-vcenter"
    >
        <Modal.Header>
            <Modal.Title>Create new teleporting room</Modal.Title>
        </Modal.Header>

        <Modal.Body>
            <Form.Group className="mb-2" controlId="formCreateRoomID">
                <Form.Control  size="lg" ref={roomIdRef} placeholder='roomId' />
            </Form.Group>
        </Modal.Body>

        <Modal.Footer className="text-center">
            <Button variant="outline-secondary" onClick={()=>setShowModal(false)} >Cancel</Button>
            <Button variant="outline-primary" onClick={doCreateRoom} >Proceed!</Button>
        </Modal.Footer>
    </Modal>

    <Container fluid="xs" id="lobby" className="text-center">
        <Row className="justify-content-md-center">
        <Col xs={12} lg={6} xl={4}>

            <h1 id="title" className='pt-4'>
                Lobby: 
                <Button size='sm' variant="outline-light" style={{color:'#4666AC', borderColor: '#4666AC',     padding: '0 0.35rem', borderRadius: '50%'}} onClick={ ()=> appClient.getRooms() }> 
                    <i className="bi bi-arrow-counterclockwise" style={{ position: 'relative', top: '1px', fontSize: 'x-large'}}/> 
                </Button>
            </h1>

            { rooms && <RoomList rooms={rooms}/> }
            
            <div className="footer">
                {user.type !== "0" && <Button onClick={()=>setShowModal(true)}> <i className="bi bi-plus"/> New Room </Button>}
            </div>

        </Col>
        </Row>
    </Container>
    </>);
}