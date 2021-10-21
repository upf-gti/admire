import Helmet from 'react-helmet';
import { useRef, useEffect, useState, useContext, useReducer } from 'react';
import { rtcClient, appClient } from 'extra/bra';
import { Container, Card, Image as ReactImage, Button, Form, Modal, Col } from 'react-bootstrap';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { ToastContext } from 'components/toasts';
import { getCookie, setCookie } from 'extra/cookies';
import post from 'extra/post';

import AnimatedBackground from 'components/animatedBackground';
import RegisterModal from 'components/registerModal';
import RecoveryModal from 'components/recoveryModal';

import login_img from "assets/img/logo.png"

export default function Login({ setLogin }) {

    const loginRef = useRef(null);
    const Log = useContext(ToastContext);
    const [showRecovery, setShowRecovery] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    let API = 'https://admire-dev-auth.brainstorm3d.com';

    async function login(email, password) {
        const toastId = Log.loading('Logging in...');
        await post(`${API}/auth/basic`, { email, password })
            .then(response => {
                switch (response.status) {
                    case 404: Log.error(`Error ${response.error}: ${response.message}`, { id: toastId }); break;
                    default: Log.success('Success', { id: toastId });
                        appClient.login(response.access_token);
                        if (loginRef.current)
                            setCookie('credentials', JSON.stringify({ id: email, pass: password }), 30);
                }
            })
            .catch(err => Log.error(`Error catch: ${err}`, { id: toastId }));
    }

    async function autoLogin() {
        const credentials = getCookie('credentials');
        if (!credentials) return;
        const { id, pass } = JSON.parse(credentials);
        if (!id || !pass) return;
        await login(id, pass);
    }

    async function doSubmitLogin() {
        let [email, password] = Array.from(loginRef.current.elements).map(v => v.value);
        email = email.toLowerCase();

        if (!email || !password) { Log.error('Please fill in all fields'); return; }
        await login(email, password);
    }

    function onLogin({ status, userId, userType, description }) {
        switch (status) {
            case 'ok': Log.success(`Logged as '${userId}'`);
                setLogin({ id: userId, type: userType });
                rtcClient.register(userId);
                break;
            case 'error': Log.error(description); break;
            default: Log.warn(description);
        }
    }

    useEffect(() => { //Acts like 'componentWillMount'
        appClient.on("login_response", onLogin);
        autoLogin();
        return () => {//Acts like /componentWillUnmount'
            appClient.off("login_response", onLogin);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (<>
        <Helmet><title>AdMiRe: LogIn</title></Helmet>
        <AnimatedBackground color1="#1B222E" color2="#666" speed={3} />

        <Container className="login d-flex vh-100">
            <div className="m-auto align-self-center">

                <Card className="shadow-lg" style={{ width: '18rem' }}>
                    <Card.Body>

                        <ReactImage id="login-logo" alt="logo" src={login_img} fluid width={254} height={254} />
                        <h1 id="title" className="mb-2 text-center">admire</h1>
                        {/*<h4 id="subtitle">Login</h4>*/}

                        <Form noValidate ref={loginRef} onKeyDown={(e) => { if (e.keyCode === 13) doSubmitLogin(); }} >

                            <Form.Group className="mb-2">
                                <Form.Control className="text-lowercase" placeholder='email' />
                            </Form.Group>

                            <Form.Group className="mb-2">
                                <Form.Control type="password" placeholder='password' />
                            </Form.Group>

                            <Button size="sm" variant="primary" className="mt-2 me-2" onClick={doSubmitLogin} ><i className="bi bi-box-arrow-in-right"></i> login</Button>
                            <Button size="sm" variant="primary" className="mt-2 me-2" onClick={() => setShowRegister(true)} ><i className="bi bi-pen"></i> register</Button>
                            <Button size="sm" variant='link' className="mt-2 me-2" onClick={() => setShowRecovery(true)} ><i className="bi bi-dot"></i> I forgot my access password!</Button>

                        </Form>
                    </Card.Body>
                </Card>

            </div>
        </Container>

        <RegisterModal show={showRegister} setShow={setShowRegister} />
        <RecoveryModal show={showRecovery} setShow={setShowRecovery} />
        <style global jsx>{`
            @import "variables.scss";
            html{
                background-color: $background;
            }

            .login
            {
                font-size:.75rem;
                color:white;

                .card {
                    //border:4px solid white;
                    border-radius: 12px;
                    background-color: transparent;
                    backdrop-filter: brightness(1.25) blur(25px);
                }

                #login-logo {
                    padding:1rem;
                    -webkit-user-drag: none;
                    user-select: none;
                    object-fit: cover;
                    object-position: top;
                    //user-drag: none; 
                }

                #title {
                    //font-family: $principal_font;
                    color: $color6;
                    font-size: 3rem;
                }

                #subtitle {
                    font-family: $principal_font;
                    color: $color5;
                }

                input {
                    background-color: $color2;
                    border-color: $color2;
                    border-radius: .75rem;
                    font-family: $principal_font;
                }

                button {
                    //position:relative;
                    //margin:0 4px;
                    //width: 7rem;
                    border-radius: .75rem;
                    //left:25%;
                    font-family: $principal_font;
                    color:white;
                    text-decoration: none;
                }
            }
        `}</style>
    </>);
}