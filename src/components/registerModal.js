import Gravatar from 'gravatar';
import Helmet from 'react-helmet';
import { ToastContext } from 'components/toasts';
import { Modal, Form, FloatingLabel, Button, Image as ReactImage } from 'react-bootstrap';
import { useRef, useState, useReducer, useContext } from 'react';
import post from 'extra/post';



export default function RegisterModal({show, setShow }) {
    const Log = useContext(ToastContext);
    const [fetching, setFetching] = useState(0);//0: not fetching, 1: fetching, 2: sucess, 3: failed

    const registerRef = useRef(null);
    const [isImageValid, setImageValid] = useState(false);
    const [isEmailValid, setEmailValid] = useState(false);
    const [gravatar_url, setGravatarImage] = useState('');

    let API = process.env.REACT_APP_SERVER_URL;

    function checkImageURL(url) {
        return (url.match(/\.(jpeg|jpg|gif|png)$/) != null);
    }

    function testImage(url, timeoutT) {
        return new Promise(function (resolve, reject) {

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

    const [image_url, setImageURL] = useReducer((value, newValue) => {
        let v = Log.promise(testImage(newValue, 1000));
        setImageValid(v);
        return newValue;
    }, '');

    function validateEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    const [userEmail, setEmail] = useReducer((value, newValue) => {
        let isValidEmail = validateEmail(newValue);

        if (isValidEmail) {
            const url = Gravatar.url(newValue, { s: '256', r: 'pg', d: '404' });
            testImage(url, 1000)
                .then(() => setGravatarImage(url))
                .catch(() => setGravatarImage(''));
        }

        setEmailValid(isValidEmail);
        return newValue;
    }, '');

    async function doSubmitRegister(e) {
        e.preventDefault();
        const [username, email, password, avatar, name, surname, birthdate, role] = Array.from(registerRef.current.elements).map(v => v.value);

        const ref = registerRef.current;
        const data = Object.assign({}, { username, email, password, avatar, name, surname, birthdate, role });
        data.email = data.email.toLowerCase();
        
        const toastId = Log.loading('Registering...');
        await post(`${API}/register`, data)
            .then(({ error, message, status }) => {
                switch (status) {
                    case 200:
                        setTimeout( () => { setFetching(0); setShow(false); } , 1000);
                        Log.success('Success', { id: toastId });
                        break;
                    default:
                        Log.error(`Error ${error}: ${message}`, { id: toastId });
                }
            })
            .catch(err => {
                Log.error(`Error: ${err}`, { id: toastId });
            });
    }

    return <>
        <Helmet>
            <link
                rel="preload"
                as="image"
                href={image_url !== '' ? image_url : gravatar_url}
                imagesrcset="wolf_400px.jpg 400w, wolf_800px.jpg 800w, wolf_1600px.jpg 1600w"
                imagesizes="50vw"
            />
        </Helmet>
        <Modal
            centered
            show={show}
            onHide={() => setShow(false)}
            backdrop="static"
            keyboard={true}
            size="md"
        >
            {
                <ReactImage
                    src={image_url !== '' ? image_url : gravatar_url}
                    roundedCircle
                    className='position-absolute top-0 start-100 p-1 bg-danger shadow'
                    width={(isImageValid || gravatar_url !== '' ? ` 128` : 0)}
                    height={(isImageValid || gravatar_url !== '' ? `128` : 0)}
                    style={{
                        width: isImageValid || gravatar_url !== '' ? ` 128px` : 0,
                        height: isImageValid || gravatar_url !== '' ? `128px` : 0,
                        transform: 'translate(-50%, -50%)', transition: '.25s ease-in-out'
                    }}
                />
            }

            <Modal.Header>
                <Modal.Title>Register</Modal.Title>
            </Modal.Header>
            <Form ref={registerRef} className="row g-2 needs-validation" autoComplete="true" preventdefault="true" noValidate onSubmit={doSubmitRegister}>
                <Modal.Body>

                    <span>Fullfill your contact information to continue.</span>

                    <Form.Group className="mb-1" children={<FloatingLabel label="username">     <Form.Control placeholder='username' type="text" />    </FloatingLabel>} />
                    <Form.Group className="mb-1" children={<FloatingLabel label="email">        <Form.Control placeholder='email' type="email" className="text-lowercase" value={userEmail} onChange={event => setEmail(event.target.value)} isInvalid={!isEmailValid} /></FloatingLabel>} />
                    <Form.Group className="mb-1" children={<FloatingLabel label="password">     <Form.Control placeholder='password (8) ' type="password"/></FloatingLabel>} />
                    <Form.Group className="mb-1" children={<FloatingLabel label="avatar URL">   <Form.Control placeholder='avatar URL' type="text" value={image_url !== '' ? image_url : userEmail !== '' ? gravatar_url : ''} onChange={event => setImageURL(event.target.value)} /></FloatingLabel>} />
                    <Form.Group className="mb-1" children={<FloatingLabel label="name">         <Form.Control placeholder='name' type="text" />    </FloatingLabel>} />
                    <Form.Group className="mb-1" children={<FloatingLabel label="surname">      <Form.Control placeholder='surname' type="text" />    </FloatingLabel>} />
                    <Form.Group className="mb-1" children={<FloatingLabel label="birthddate">   <Form.Control placeholder='birthdate' type="date" />    </FloatingLabel>} />

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
                    <Button variant="secondary" onClick={() => setShow(false)}><i className="bi bi-x-circle"></i> Close</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    </>;
}