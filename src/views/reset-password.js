import { useRef, useContext } from 'react';
import { ToastContext } from 'components/toasts';
import { useParams, useHistory } from 'react-router-dom';
import { Container, Modal, Form, Button } from "react-bootstrap";
import toast from 'react-hot-toast';

import Helmet from 'react-helmet';
import AnimatedBackground from 'components/animatedBackground';


async function post(url = '', data = {}) {
    for(let v in data)
        if(!data[v]) delete(data[v]);
    const d = JSON.stringify(data);
    
    // Default options are marked with *
    const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        //credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        //redirect: 'follow', // manual, *follow, error
        //referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: d // body data type must match "Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
}

export default function ResetPassword(){
    
    let { token } = useParams();
    const history = useHistory();
    const passwordRef = useRef(null);
    const Log = useContext(ToastContext);

    let API = 'https://admire-dev-auth.brainstorm3d.com';
    console.log(token);

    async function doSubmitPassword(e) {
        e.preventDefault();
        const [password] = Array.from(passwordRef.current.elements).map(v => v.value);
        const toastId = toast.loading('Resetting password...');
        await post(`${API}/reset-password/${token}`, { password })
        .then(response => {
            if(!response){
                Log.error(`Error: ${response.message}`, {id: toastId});
                return;
            }
            Log.success('Success', {id: toastId});
            setTimeout( ()=>history.push(`/`), 1000);
        })
        .catch(err => {
            Log.error(`Error: ${err}`, {id: toastId});
        });
    }

    return <>
        <Helmet>
            <title>AdMiRe: Reset password</title>
        </Helmet>

        <Container className="login d-flex vh-100">
            <div className="m-auto align-self-center">

                <Modal
                    show={true}
                    centered
                    backdrop="static"
                    size="md"
                    dialogClassName="modal-shadow-lg"
                >
                    <Modal.Header>
                        <Modal.Title>Password Recovery</Modal.Title>
                    </Modal.Header>
                    <Modal.Body as={Form} ref={passwordRef}>

                        <span>Please enter a new password. 
                            <br/>Length has to be at least 8 characters long.</span>

                        <Form.Group className="mb-2 mt-4" >
                            <Form.Control placeholder='password' type="password" />
                        </Form.Group>

                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary"   onClick={doSubmitPassword}><i className="bi bi-telegram"></i> Send</Button>
                    </Modal.Footer>
                </Modal>

            </div>
        </Container>
    </>;
}