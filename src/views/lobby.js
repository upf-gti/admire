import Helmet from 'react-helmet';
import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { Container, Card, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import {Toasts, ToastContext} from 'components/toasts';

import RoomList from 'components/roomlist';
import CreateRoomModal from 'components/createRoomModal';	

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
            const interval = setInterval(() => {appClient.getRooms();} , 2000);
        
        return () => {
            appClient.off('get_rooms_response',   onGetRooms);
            appClient.off('create_room_response', onCreateRoom);
            clearInterval(interval);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);
    
    function onCreateRoom({id, status, description, roomId})
    {
        switch(status)
        {
            case 'ok': 
                Log.success(`Room '${roomId}' created`);
                setShowModal(false);
                history.push(`/rooms/${roomId}`)
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
    <Helmet><title>AdMiRe: {`${user.type !== "0" ? "Admin" : "User"} ${ user.id }`}</title></Helmet>

    <Container fluid="xs" id="lobby" className="text-center">
        <Row className="justify-content-md-center">
        <Col xs={12} lg={6} xl={4}>

            <h1 id="title" className='pt-4'>
                <Button size='sm' variant="outline-light"  onClick={ ()=> appClient.getRooms() }> 
                    <i className="bi bi-arrow-counterclockwise" style={{ position: 'relative', top: '1px', fontSize: 'x-large'}}/> 
                </Button>
                Lobby: 
            </h1>

            {  rooms && <RoomList rooms={rooms}/> }
            { !rooms && <span>No rooms found</span> }

            <div className="footer">
                {user.type !== "0" && <Button onClick={()=>setShowModal(true)}> <i className="bi bi-plus"/> New Room </Button>}
            </div>
        </Col>
        </Row>
    </Container>

    <CreateRoomModal show={showModal} setShow={setShowModal} callback={()=>{}} />

    <style global jsx>{`
        @import "variables.scss";
        #create-room-modal
        {
            .modal-header
            {
                color:white;
            }

            .modal-content
            {
                box-shadow: 0 0 30px rgba(0,0,0,.5);

                background-color: $color1 !important;
                input{
                    color:white;
                    border-radius:10px;
                    border-color:$color2;
                    background-color: $color2;
                    font-family: $principal_font;
                }
            }

            .modal-footer{
                text-align: center;
                
                button{
                    font-family: $principal_font;
                    border-radius:20px;
                }
            }
        }    
    `}</style>
    </>);
}