import Helmet from 'react-helmet';
import { ToastContext } from 'components/toasts';
import { useRef, useState, useContext } from 'react';
import { Modal, Form, FloatingLabel, Button, Spinner } from 'react-bootstrap';
import { RTCEvent, rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';


export default function ForwardStreamModal({show, setShow, callback}) {
    const Log = useContext(ToastContext);
    const ref = useRef(null);
    const [fetching, setFetching] = useState(0);//0: not fetching, 1: fetching, 2: sucess, 3: failed

    function submit() {
        if ( !ref?.current || !show )
            return setShow(false);
            
            setFetching(true);            
            setFetching(2);   
            appClient.createRoom(ref.current.value);
            setTimeout( () => { setFetching(0); setShow(false); } , 1000);
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
            onKeyDown={(e) => {
                if (e.keyCode === 13)
                    submit();
            }} tabIndex="0"
        >
            <Modal.Header>
                <Modal.Title>Create new teleporting room</Modal.Title>
            </Modal.Header>

           <Modal.Body>
                <Form.Group className="mb-2" controlId="formCreateRoomID">
                    <Form.Control  size="lg" ref={ref} placeholder='roomId' />
                </Form.Group>
            </Modal.Body>

            <Modal.Footer className="text-center">
                <Button variant="outline-secondary" onClick={() => setShow(false)} >Cancel</Button>
                {  fetching === 1 && <Button variant="outline-primary"> 
                    <Spinner as="span"      animation="border"      size="sm"      role="status"      aria-hidden="true"/>
                 </Button> }
                { fetching === 2 && <Button variant="outline-success" > ✔️ Succeed! </Button> }
                { fetching === 3 && <Button variant="outline-danger"  > ❌ Error </Button> }
                { fetching === 0 && <Button variant="outline-primary" onClick={submit} >Proceed!</Button> }
            </Modal.Footer>
        </Modal>
    </>;
}