import Helmet from 'react-helmet';
import { ToastContext } from 'components/toasts';
import { useRef, useState, useContext, useEffect } from 'react';
import { Modal, Form, FloatingLabel, Button } from 'react-bootstrap';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

import post from 'extra/post';


export default function DisconnectedModal({show, setShow, callback}) {
    const Log = useContext(ToastContext);
    let [time, setTime] = useState(0);

    useEffect(()=>{
        const id =  setInterval(tick, 1000);
        if(!show)   clearInterval(id);
        
    return ()=>{
        clearInterval(id);
    }},[show]);

    function tick(){
        if(time > 0){
            time -= 1;
            setTime( time );
        }
        else   {
            callback()
            setTimeout( ()=> setTime( 10 ), 1000 );
        } 
        
    }

    return <>
        <Modal
            centered
            show={show}
            onHide={() => setShow(false)}
            backdrop="static"
            keyboard={true}
            size="md"
            dialogClassName="modal-shadow-lg"
        >
            <Modal.Header>
                <Modal.Title>Oops! Connection lost with server</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <span>Trying to reconnect in {time}</span>
            </Modal.Body>
        </Modal>
    </>;
}