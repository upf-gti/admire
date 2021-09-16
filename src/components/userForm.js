import { useState, useRef } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

export default function UserForm({ show, setShow }) {
    const [changed, setChanged] = useState(false);
    const formRef = useRef(null);

    function onClose() {
        setShow(false);
        setChanged(false);
    }

    function doSubmit() {

    }
    
    return <>
        <Modal
            show={show}
            centered
            backdrop="static"
            size="md"
            dialogClassName="modal-shadow-lg"
        >
            <Modal.Header>
                <Modal.Title>User info</Modal.Title>
            </Modal.Header>
            <Modal.Body as={Form} ref={formRef}>

                <span>Please enter a new password.</span>

                <Form.Group className="mb-2 mt-4" onChange={() => alert('changed!')}>
                    <Form.Control placeholder='password' type="password" />
                </Form.Group>

            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={doSubmit}><i className="bi bi-telegram"></i> Save changes</Button>
                {changed && <Button variant="primary" onClick={onClose}><i className="bi bi-telegram"></i> Discard changes</Button>}
                {!changed && <Button variant="primary" onClick={onClose}><i className="bi bi-telegram"></i> Close</Button>}
            </Modal.Footer>
        </Modal>
    </>;
}