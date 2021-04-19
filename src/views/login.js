import { useRef, useEffect } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { Container, Card, Image, Button, Form } from 'react-bootstrap';

import AnimatedBackground from 'components/animatedBackground';

import login_img from "assets/img/logo.png"
import "./login.scss";

export default function Login({ setLogin }) {

    const userRef = useRef(null);
    const passRef = useRef(null);

    function doSubmit() {
        appClient.login(userRef.current.value, passRef.current.value);
    }

    function onLogin(event) {
        setLogin({ id: event.userId, type: event.userType });
        console.log('logged', event);
    }

    useEffect(() => { //Acts like 'componentWillMount'
            appClient.on("login_response", onLogin);
        return () => {//Acts like /componentWillUnmount'
            appClient.off("login_response", onLogin);
        }
    }, []);

    return (<>
        <AnimatedBackground color1="#232727" color2="#666" speed={3}/>

        <Container className="login d-flex vh-100">
            <div className="m-auto align-self-center">

            <Card className="shadow-lg" style={{ width: '18rem' }}>
                <Card.Body>

                    <Image id="login-logo" src={login_img} fluid />
                    <h1 id="title" className="mb-5 text-center">admire</h1>
                    <h4 id="subtitle">Login</h4>

                    <Form noValidate>

                        <Form.Group className="mb-2" controlId="formLoginID">
                            <Form.Control  ref={userRef} placeholder='id' />
                        </Form.Group>

                        <Form.Group className="mb-4" controlId="formLoginID">
                            <Form.Control  ref={passRef} placeholder='password' />
                        </Form.Group>

                        <Button variant="primary" size="m" onClick={doSubmit}>submit</Button>

                    </Form>
                </Card.Body>
            </Card>

            </div>
        </Container>
    </>);
}