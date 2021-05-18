import Helmet from 'react-helmet';
import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { Container, Card, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import {Toasts, ToastContext} from 'components/toasts';

import RoomList from 'components/roomlist';

import "./lobby.scss";

export default function Lobby({user, setLogin, setNavItem}) {
    
    let history = useHistory();
    const Log = useContext(ToastContext);

    const roomIdRef = useRef(null);
    const [rooms, setRooms] = useState(null);
    const [fetching, setFetching] = useState(true);
    const [showModal, setShowModal] = useState(null);

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
        //console.log('create room');
        appClient.createRoom(roomIdRef.current.value);
        //document.location(`/rooms/${roomIdRef.current.value}`);
    }

    function onCreateRoom({id, status, description, roomId})
    {
        switch(status)
        {
            case 'ok': 
                Log.success(`Room '${roomId}' created`);
                setShowModal(false);
                history.push(`/rooms/${roomId}`)
                //appClient.getRooms();
                //document.location = `/rooms/${roomId}`;
            break;
            case 'error': Log.error(`onCreateRoom '${roomId}': ${description}`); break;
            default:      Log.warn( `onCreateRoom '${roomId}': ${description}`); break;

        }
    }

    function onGetRooms({status, description, roomInfos})
    {
        setFetching(false);
        if(status === 'error')
        {
            Log.error(`onGetRooms: ${description}`);
            return;
        } 
        setRooms(Object.values(roomInfos ?? null));
    }

    return (<>
    <Helmet>
        <title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${ user.id }`}</title>
    </Helmet>
    <Modal 
        centered 
        id="create-room-modal" 
        show={showModal?true:false} 
        //onHide={()=>setShowModal(false)}
        aria-labelledby="contained-modal-title-vcenter"
        onKeyDown={ (e)=>{
            if(e.keyCode === 13)
                doCreateRoom();
        } } tabIndex="0"
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
                <Button size='sm' variant="outline-light"  onClick={ ()=> appClient.getRooms() }> 
                    <i className="bi bi-arrow-counterclockwise" style={{ position: 'relative', top: '1px', fontSize: 'x-large'}}/> 
                </Button>
                Lobby: 
            </h1>

            { !rooms && <span>No rooms found</span> }
            { rooms && <RoomList rooms={rooms}/> }

            
            <div className="footer">
                {user.type !== "0" && <Button onClick={()=>setShowModal(true)}> <i className="bi bi-plus"/> New Room </Button>}
            </div>

        </Col>
        </Row>
    </Container>
    </>);
}