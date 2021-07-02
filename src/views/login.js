import Helmet from 'react-helmet';
import { useRef, useEffect, useState, useContext } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { Container, Card, Image, Button, Form, Modal } from 'react-bootstrap';
import { ToastContext } from 'components/toasts';

import AnimatedBackground from 'components/animatedBackground';

import login_img from "assets/img/logo.png"
import "./login.scss";

export default function Login({ setLogin }) {

    const Log = useContext(ToastContext);
    const [showRegister, setShowRegister] = useState(false);
    const [showRecovery, setShowRecovery] = useState(false);

    const userRef = useRef(null);
    const passRef = useRef(null);

    function doSubmit() {
        appClient.login(userRef.current.value, passRef.current.value);
    }

    function onLogin(event) {

        const { status, userId, userType, description } = event;

        switch (status) {
            case 'ok':
                setLogin({ id: userId, type: userType });
                rtcClient.register(userId);
                Log.success(`Logged as '${event.userId}'`);
                break;
            case 'error':
                //TODO: show error toast
                Log.error(description);
                break;
            default:
                Log.warn(description);
        }
    }

    useEffect(() => { //Acts like 'componentWillMount'
        appClient.on("login_response", onLogin);
        return () => {//Acts like /componentWillUnmount'
            appClient.off("login_response", onLogin);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (<>
        <Helmet>
            <title>AdMiRe: LogIn</title>
        </Helmet>
        <AnimatedBackground color1="#1B222E" color2="#666" speed={3} />

        <Container className="login d-flex vh-100">
            <div className="m-auto align-self-center">

                <Card className="shadow-lg" style={{ width: '18rem' }}>
                    <Card.Body>

                        <Image id="login-logo" src={login_img} fluid />
                        <h1 id="title" className="mb-2 text-center">admire</h1>
                        {/*<h4 id="subtitle">Login</h4>*/}

                        <Form noValidate>

                            <Form.Group className="mb-2" controlId="formLoginID">
                                <Form.Control ref={userRef} placeholder='id' />
                            </Form.Group>

                            <Form.Group className="mb-2" controlId="formLoginID">
                                <Form.Control ref={passRef} type="password" placeholder='password' />
                            </Form.Group>

                            <Button size="sm" variant="primary" className="mt-2 me-2" onClick={doSubmit} ><i class="bi bi-box-arrow-in-right"></i> login</Button>
                            <Button size="sm" variant="primary" className="mt-2 me-2" onClick={() => setShowRegister(true)} ><i class="bi bi-pen"></i> register</Button>
                            <Button size="sm" variant='link' className="mt-2 me-2" onClick={() => setShowRecovery(true)} ><i class="bi bi-dot"></i> I forgot my access password!</Button>

                        </Form>
                    </Card.Body>
                </Card>


                <Modal
                    centered
                    show={showRegister}
                    onHide={() => setShowRegister(false)}
                    backdrop="static"
                    keyboard={true}
                    size="sm"
                >
                    <Modal.Header>
                        <Modal.Title>Register</Modal.Title>
                    </Modal.Header>
                    <Modal.Body as={Form}>

                        <Form.Group className="mb-2" controlId="formRegisterID">
                            <Form.Control placeholder='mail' />
                        </Form.Group>

                        <Form.Group className="mb-2" controlId="formRegisterPassword">
                            <Form.Control type="password" placeholder='password' />
                        </Form.Group>

                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary">Understood</Button>
                        <Button variant="secondary" onClick={() => setShowRegister(false)}><i class="bi bi-x-circle"></i> Close</Button>
                    </Modal.Footer>
                </Modal>

                <Modal
                    centered
                    show={showRecovery}
                    onHide={() => setShowRecovery(false)}
                    backdrop="static"
                    keyboard={true}
                    size="sm"
                    dialogClassName="modal-shadow-lg"
                >
                    <Modal.Header>
                        <Modal.Title>Password Recovery</Modal.Title>
                    </Modal.Header>
                    <Modal.Body as={Form}>




                        RECOVER YOUR PASSWORD
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary"><i class="bi bi-telegram"></i> Send</Button>
                        <Button variant="secondary" onClick={() => setShowRecovery(false)}><i class="bi bi-x-circle"></i> Close</Button>
                    </Modal.Footer>
                </Modal>

            </div>
        </Container>
    </>);
}