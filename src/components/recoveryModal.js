import Helmet from 'react-helmet';
import { ToastContext } from 'components/toasts';
import { useRef, useState, useContext } from 'react';
import { Modal, Form, FloatingLabel, Button } from 'react-bootstrap';
import post from 'extra/post';


export default function ({show, setShow}) {
    const Log = useContext(ToastContext);

    const recoveryRef = useRef(null);

    let API = 'https://admire-dev-auth.brainstorm3d.com';
    const CORS = "https://cors-anywhere.herokuapp.com/"
    API = CORS + API;//Comment this on development

    async function doSubmitRecovery(e) {
        e.preventDefault();
        const [email] = Array.from(recoveryRef.current.elements).map(v => v.value);
        const toastId = Log.loading('Resetting password...');
        await post(`${API}/forgot-password`, { email })
            .then(response => {

                if (!response) {
                    Log.error(`Error: ${response.message}`, { id: toastId });
                    return;
                }

                setShow(false);
                Log.success('Success', { id: toastId });
            })
            .catch(err => {
                Log.error(`Error: ${err}`, { id: toastId });
            });
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
                <Modal.Title>Password Recovery</Modal.Title>
            </Modal.Header>
            <Modal.Body as={Form} ref={recoveryRef}>

                <span>Please enter the adress mail you registered with. Check mail the next 5 minutes to receive next steps.</span>

                <Form.Group className="mb-2 mt-4" >
                    <Form.Control placeholder='someone@myprovider.com' />
                </Form.Group>

            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={doSubmitRecovery}><i className="bi bi-telegram"></i> Send</Button>
                <Button variant="secondary" onClick={() => setShow(false)}><i className="bi bi-x-circle"></i> Close</Button>
            </Modal.Footer>
        </Modal>
    </>;
}