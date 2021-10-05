import Helmet from 'react-helmet';
import { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Nav, Image, Button, FormRange } from 'react-bootstrap';

import img1 from 'assets/img/bg1.jpg';
import img2 from 'assets/img/bg2.jpg';
import img3 from 'assets/img/wizard2.png';
import Video from 'components/video';
import {StreamSettings} from 'components/streamSettings';

import './wizzard.scss';


export default function Wizzard( {user, ready:{ready, setReady}, setNavItem}){

    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);

    let items = {
        'Video':      [<i className="bi bi-cast"></i>, <Video stream={localStream}/>],
        'Brightness': [<i className="bi bi-brightness-high"></i>, <img alt='' src={img1}/>],
        'Contrast':   [<i className="bi bi-octagon-half"></i>, <img alt='' src={img2}/>],
    }

    useEffect(()=>{
        
    },[]);

    return (<>
        <Helmet>
            <title>AdMiRe: Wizzard</title>
        </Helmet>

        <Container fluid="md" id='wizzard'>
            <Tab.Container as={Row} defaultActiveKey="0">

                <Col xs={12} className='text-center' >
                <h1 style={{color:"hsl(210, 11%, 85%)", paddingTop:".75rem"}}><Image src={img3} style={{    
                    height: '3rem',
                    paddingBottom: '5px',
                    filter: 'invert(1)'
                }}/>Wizzard</h1>
                </Col>

                <Nav variant="pills" className='flex-column' >
                    {[
                        <><i className="bi bi-cast"/> Video</>,
                        <><i className="bi bi-brightness-high"/> Brightness </>,
                        <><i className="bi bi-octagon-half"/> Contrast </>
                    ].map((v,k,a)=>{
                        return <Nav.Item className='mb-2 pichi' key={k} style={{animationDelay: `${k*.15 + .5}s`}}> <Nav.Link eventKey={k}>{v}</Nav.Link> </Nav.Item>;
                    })}
                </Nav>

                <Col as={Tab.Content} xs={12} className="d-flex">
                    
                    <Tab.Pane eventKey={0} className="m-auto  align-self-center">
                        {devices && <Video stream={localStream} user={user} id={'local'} key={-1} local playsInline/>}
                    </Tab.Pane>

                    <Tab.Pane as={Card} eventKey={1} className="shadow-sm p-2 m-auto  align-self-center">
                        <Image src={img1}/>
                        <Col xs={12} className='mt-5'>
                            <label htmlFor="range">Do you like cheese?</label>
                            <input name='range' type='range'/>
                            <p> Please use the sliders to adjust the brightness of the image until the bright and dark spots disappear                        </p>
                        </Col>
                    </Tab.Pane>

                    <Tab.Pane eventKey={2} className="m-auto  align-self-center">
                        <Image src={img2}/>
                    </Tab.Pane>

                </Col>
            </Tab.Container>

            { <div className="text-center">
                { (window.location.pathname === '/wizzard') && <Link to='/'>  <Button  variant="primary" size="lg" onClick={()=>setReady(true)} title={'Ready!'}>Ready!</Button> </Link>}
                { (window.location.pathname !== '/wizzard') && <Button  variant="primary" size="lg" onClick={()=>setReady(true)} title={'Ready!'}>Ready!</Button> }
            </div> }
        </Container>
    </>)
}