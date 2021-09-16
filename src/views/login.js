import Helmet from 'react-helmet';
import { useRef, useEffect, useState, useContext, useReducer } from 'react';
import { rtcClient, appClient } from 'extra/bra';
import { Container, Card, Image as ReactImage, Button, Form, Modal, Col } from 'react-bootstrap';
import { ToastContext } from 'components/toasts';
import { getCookie, setCookie } from 'extra/cookies';

import Gravatar from 'gravatar'
import AnimatedBackground from 'components/animatedBackground';

import login_img from "assets/img/logo.png"
import "./login.scss";

function checkImageURL(url) {
    return(url.match(/\.(jpeg|jpg|gif|png)$/) != null);
}

function testImage(url, timeoutT) {
    return new Promise(function (resolve, reject) 
    {
    
        var timeout = timeoutT || 5000;
        var timer, img = new Image();
        img.onerror = img.onabort = function () {
            clearTimeout(timer);
            reject("Error: the url provided is not an image");
        };
        img.onload = function () {
            clearTimeout(timer);
            resolve("success");
        };
        timer = setTimeout(function () {
            // reset .src to invalid URL so it stops previous
            // loading, but doesn't trigger new load
            img.src = "//!!!!/test.jpg";
            reject("timeout");
        }, timeout);
        img.src = url;


    });
}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

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

export default function Login({ setLogin }) {

    const Log = useContext(ToastContext);
    let API = 'https://admire-dev-auth.brainstorm3d.com';
    const CORS = "https://cors-anywhere.herokuapp.com/"
    API = CORS+API;//Comment this on development
    
    const [showRegister, setShowRegister] = useState(false);
    const [showRecovery, setShowRecovery] = useState(false);
    const [isImageValid, setImageValid]   = useState(false);
    const [isEmailValid, setEmailValid]   = useState(false);
    const [gravatar_url, setGravatarImage] = useState('');

    const [image_url, setImageURL] = useReducer( (value, newValue)=>{
        let v = Log.promise(testImage(newValue, 1000));
        setImageValid(v);
        return newValue;
    }, '');

    const [userEmail, setEmail] = useReducer( (value, newValue)=>{
        let isValidEmail = validateEmail(newValue);
        
        if (isValidEmail){
            const url = Gravatar.url(newValue, {s: '256', r: 'pg', d: '404'});
            testImage(url, 1000)
            .then( () => setGravatarImage(url))
            .catch(() => setGravatarImage(''));
        }
        
        setEmailValid( isValidEmail );
        return newValue;
    }, '');

    const loginRef = useRef(null);
    const registerRef = useRef(null);
    const recoveryRef = useRef(null);

    async function login(email, password){
        //appClient.login('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwidXNlcm5hbWUiOiJHYW5kYWxmIiwicm9sZSI6MX0.g1jOrsjPGDt_gBkNcM62SQpJaccAZ88dOQZ5XD9FTLs');
        const toastId = Log.loading('Logging in...');
        await post(`${API}/auth/basic`, { email, password })
        .then(response => {
            switch( response.status ){
                case 401: //Invalid credentials
                case 404: //Not found
                    Log.error(`Error ${response.error}: ${response.message}`, {id: toastId});
                    break;
                default:
                    Log.success('Success', {id: toastId});
                    if(loginRef.current){
                        setCookie('credentials', JSON.stringify({ id: email, pass: password }), 30);
                    }
                    appClient.login(response.access_token);
            }
        })
        .catch(err => {
            Log.error(`Error catch: ${err}`, {id: toastId});
        });
    }

    async function autoLogin(){
        const credentials = getCookie('credentials');
        if(credentials)
        {
            const {id, pass} = JSON.parse(credentials);
            await login(id, pass);
        } 
    }

    async function doSubmitLogin() {
        const [email, password] = Array.from(loginRef.current.elements).map(v => v.value);
        await login(email, password);
    }

    async function doSubmitRegister(e) {
        e.preventDefault();
        const [username, email, password, avatar, name, surname, birthdate, role] = Array.from(registerRef.current.elements).map(v => v.value);

        const ref = registerRef.current;
        const data = Object.assign({}, { username, email, password, avatar, name, surname, birthdate, role });

        const toastId = Log.loading('Registering...');
        await post(`${API}/register`, data)
        .then(response => {
            switch(response.statusCode)
            {
                case 400:  
                    Log.error(`Error: ${response.message}`, {id: toastId}); 
                    break;
                default:
                    setShowRegister(false);
                    Log.success('Success', {id: toastId});
            }
        })
        .catch(err => {
            Log.error(`Error: ${err}`, {id: toastId});
        });
    }

    async function doSubmitRecovery(e) {
        e.preventDefault();
        const [email] = Array.from(recoveryRef.current.elements).map(v => v.value);
        const toastId = Log.loading('Resetting password...');
        await post(`${API}/forgot-password`, { email })
        .then(response => {
      
            if(!response){
                Log.error(`Error: ${response.message}`, {id: toastId});
                return;
            }

            setShowRecovery(false);
            Log.success('Success', {id: toastId});
        })
        .catch(err => {
            Log.error(`Error: ${err}`, {id: toastId});
        });
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
        autoLogin();
        return () => {//Acts like /componentWillUnmount'
            appClient.off("login_response", onLogin);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleKeypress = e => {
        //it triggers by pressing the enter key
      if (e.keyCode === 13) {
        doSubmitLogin();
      }
    };
    
    return (<>
        <Helmet>
            <title>AdMiRe: LogIn</title>
            <link
            rel="preload"
            as="image"
            href={image_url!==''?image_url:gravatar_url} 
            imagesrcset="wolf_400px.jpg 400w, wolf_800px.jpg 800w, wolf_1600px.jpg 1600w"
            imagesizes="50vw"
            />
        </Helmet>
        <AnimatedBackground color1="#1B222E" color2="#666" speed={3} />

        <Container className="login d-flex vh-100">
            <div className="m-auto align-self-center">

                <Card className="shadow-lg" style={{ width: '18rem' }}>
                    <Card.Body>

                        <ReactImage id="login-logo" alt="logo" src={login_img} fluid width={254} height={254} />
                        <h1 id="title" className="mb-2 text-center">admire</h1>
                        {/*<h4 id="subtitle">Login</h4>*/}

                        <Form noValidate ref={loginRef} onKeyPress={handleKeypress}>

                            <Form.Group className="mb-2">
                                <Form.Control placeholder='email' />
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


                <Modal
                    centered
                    show={showRegister}
                    onHide={() => setShowRegister(false)}
                    backdrop="static"
                    keyboard={true}
                    size="md"
                >
                    {
                            <ReactImage 
                            src={image_url!==''?image_url:gravatar_url} 
                            roundedCircle 
                            alt="avatar image"
                            className = 'position-absolute top-0 start-100 p-1 bg-danger shadow'
                            width     = {(isImageValid || gravatar_url !== ''?` 128`: 0)}
                            height    = {(isImageValid || gravatar_url !== ''? `128`: 0)}
                            style     = {{ 
                                width:      isImageValid || gravatar_url !== ''?` 128px`: 0, 
                                height:     isImageValid || gravatar_url !== ''? `128px`: 0, 
                                transform: 'translate(-50%, -50%)', transition: '.25s ease-in-out'}}
                            />
                    }

                    <Modal.Header>
                        <Modal.Title>Register</Modal.Title>
                    </Modal.Header>
                    <Form ref={registerRef} className="row g-2 needs-validation" autoComplete="true" preventdefault="true" noValidate onSubmit={doSubmitRegister}>
                    <Modal.Body>

                        <span>Fullfill your contact information to continue.</span>

                        
                        <Form.Group className="mb-1" children={<Form.Control placeholder='username'  type="text"     required    /> }/>
                        <Form.Group className="mb-1" children={<Form.Control placeholder='email'     type="email"    required    value={userEmail} onChange={event => setEmail(event.target.value)} isInvalid={!isEmailValid} /> }/>
                        <Form.Group className="mb-1" children={<Form.Control placeholder='password'  type="password" required    /> }/>
                        <Form.Group className="mb-1" children={<Form.Control placeholder='avatar URL'type="text"     value={image_url!==''?image_url:gravatar_url} onChange={event => setImageURL(event.target.value)}  /> }/>
                        <Form.Group className="mb-1" children={<Form.Control placeholder='name'      type="text"                 /> }/>
                        <Form.Group className="mb-1" children={<Form.Control placeholder='surname'   type="text"                 /> }/>
                        <Form.Group className="mb-1" children={<Form.Control placeholder='birthdate' type="date"                 /> }/>

                        <div className="form-floating">
                            <select className="form-select" id="floatingSelect" aria-label="Floating label select example">
                                <option value="0">User</option>
                                <option value="1">Admin</option>
                            </select>
                            <label htmlFor="floatingSelect"> User role</label>
                        </div>



                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary" type="submit"><i className="bi bi-telegram"></i> Proceed</Button>
                        <Button variant="secondary" onClick={() => setShowRegister(false)}><i className="bi bi-x-circle"></i> Close</Button>
                    </Modal.Footer>
                    </Form>
                </Modal>

                <Modal
                    centered
                    show={showRecovery}
                    onHide={() => setShowRecovery(false)}
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
                        <Button variant="secondary" onClick={() => setShowRecovery(false)}><i className="bi bi-x-circle"></i> Close</Button>
                    </Modal.Footer>
                </Modal>

            </div>
        </Container>
    </>);
}