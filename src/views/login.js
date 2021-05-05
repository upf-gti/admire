import Helmet from 'react-helmet';
import { useRef, useEffect, useContext } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { Container, Card, Image, Button, Form } from 'react-bootstrap';
import {ToastContext} from 'components/toasts';

import AnimatedBackground from 'components/animatedBackground';

import login_img from "assets/img/logo.png"
import "./login.scss";

export default function Login({ setLogin }) {

    const Log = useContext(ToastContext);   

    const userRef = useRef(null);
    const passRef = useRef(null);

    function doSubmit() {
        appClient.login(userRef.current.value, passRef.current.value);
    }

    function onLogin(event) {

        const {status, userId, userType, description} = event;

        switch(status)
        {
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
        <AnimatedBackground color1="#1B222E" color2="#666" speed={3}/>

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

                        <Button variant="primary" size="m" onClick={doSubmit} >submit</Button>

                    </Form>
                </Card.Body>
            </Card>

            </div>
        </Container>
    </>);
}