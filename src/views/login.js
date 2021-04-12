import { useRef, useEffect } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';

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
        <h2>Login</h2>
        <input ref={userRef} id='user' placeholder='id' />
        <input ref={passRef} id='pass' placeholder='password' />
        <button onClick={doSubmit}>submit</button>
    </>);
}