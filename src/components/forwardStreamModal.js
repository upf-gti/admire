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
        const [forwardingCallId, mediaHubtarget] = [show, ref.current.value];
        if (!rtcClient.call(mediaHubtarget, ({callId, status, description}) => {
            if(status === 'error'){
                setFetching(3);           
                setTimeout( () => { setFetching(0); } , 2000);
                Log.error(`Call response error: ${description}`);
            }
            else {
                setFetching(2);   
                setTimeout( () => { setFetching(0); setShow(false); } , 1000);
                callback(callId, forwardingCallId);
            }
        })){
            setFetching(3);   
            Log.error(`call missed to backend`);
            setTimeout( () => { setFetching(0); } , 2000);
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
            onKeyDown={(e) => {
                if (e.keyCode === 13)
                    callback();
            }} tabIndex="0"
        >
            <Modal.Header>
                <Modal.Title> Send Peer to Live </Modal.Title>
            </Modal.Header>

           <Modal.Body>
                <Form.Group className="mb-2">
                    <Form.Control size="lg" ref={ref} placeholder='enter live Id' />
                </Form.Group>
            </Modal.Body>

            <Modal.Footer className="text-center">
                {  fetching === 1 && <Button variant="outline-primary"> 
                    <Spinner as="span"      animation="border"      size="sm"      role="status"      aria-hidden="true"/>
                 </Button> }
                { fetching === 2 && <Button variant="outline-success" > ✔️ Succeed! </Button> }
                { fetching === 3 && <Button variant="outline-danger"  > ❌ Error </Button> }
                 
                { !fetching && <Button variant="outline-primary" onClick={submit} >Proceed!</Button> }
                <Button variant="outline-secondary" onClick={() => setShow(false)} >Close</Button>
            </Modal.Footer>
        </Modal>
    </>;
}