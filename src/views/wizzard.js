import Helmet from 'react-helmet';
import { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Nav, Image, Button, FormRange } from 'react-bootstrap';

import img1 from 'assets/img/bg1.jpg';
import img2 from 'assets/img/bg2.jpg';
import img3 from 'assets/img/wizard2.png';
import VideoStream from 'components/videostream';
import {StreamSettings} from 'components/streamSettings';

import './wizzard.scss';


export default function Wizard({ready:{ready, setReady}, setNavItem}){

    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);

    let items = {
        'Video':      [<i class="bi bi-cast"></i>, <VideoStream/>],
        'Brightness': [<i class="bi bi-brightness-high"></i>, <img src={img1}/>],
        'Contrast':   [<i class="bi bi-octagon-half"></i>, <img src={img2}/>],
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
                <h1 style={{color:"hsl(210, 11%, 85%)", paddingTop:"2rem"}}><Image src={img3} style={{    
                    height: '3rem',
                    paddingBottom: '5px',
                    filter: 'invert(1)'
                }}/>Wizzard</h1>
                </Col>

                <Nav variant="pills" className='flex-column' >
                    {[
                        <><i class="bi bi-cast"/> Video</>,
                        <><i class="bi bi-brightness-high"/> Brightness </>,
                        <><i class="bi bi-octagon-half"/> Contrast </>
                    ].map((v,k,a)=>{
                        return <Nav.Item className='mb-2 pichi' key={k} style={{animationDelay: `${k*.15 + .5}s`}}> <Nav.Link eventKey={k}>{v}</Nav.Link> </Nav.Item>;
                    })}
                </Nav>

                <Col as={Tab.Content} xs={12} className="d-flex" style={{  height: 'calc(100vh - 2rem)'}}>
                    
                    <Tab.Pane eventKey={0} className="m-auto  align-self-center">
                        {devices && <VideoStream local fref={videoRef} videoDevices={devices.video} audioDevices={devices.audio}/> }
                    </Tab.Pane>

                    <Tab.Pane as={Card} eventKey={1} className="shadow-sm p-2 m-auto  align-self-center">
                        <Image src={img1}/>
                        <Col xs={12} className='mt-5'>
                            <label for="range">Do you like cheese?</label>
                            <input name='range' type='range'/>
                            <p> Please use the sliders to adjust the brightness of the image until the bright and dark spots disappear                        </p>
                        </Col>
                    </Tab.Pane>

                    <Tab.Pane eventKey={2} className="m-auto  align-self-center">
                        <Image src={img2}/>
                    </Tab.Pane>

                </Col>
            </Tab.Container>

            { <div className="footer text-center">
                { (window.location.pathname === '/wizzard') && <Link to='/'>  <Button  variant="primary" size="lg" onClick={()=>setReady(true)} title={'Ready!'}>Ready!</Button> </Link>}
                { (window.location.pathname !== '/wizzard') && <Button  variant="primary" size="lg" onClick={()=>setReady(true)} title={'Ready!'}>Ready!</Button> }
            </div> }
        </Container>
    </>)
}

/*
<Row className="justify-content-center">
        <Col xs={11}>
            <h1 id="title" style={{color:"hsl(210, 11%, 85%)", marginTop:"1rem"}}>Wizzard</h1>
            
            <Card className='vh-90'>
                
            <Tab.Container id="left-tabs-example" defaultActiveKey="first">
            <Row>

                <Col sm={12} className='h-80'>
                <Tab.Content>

                    { Object.entries(items).map((v,k,a)=>{
                        return <Tab.Pane eventKey={k}>{v[1][1]}</Tab.Pane>;
                    })}

                </Tab.Content>
                </Col>

                <Col sm={12}>
                <Nav variant="pills" justify={true} fill={true} >
                    { Object.entries(items).map((v,k,a)=>{
                        return <Nav.Item><Nav.Link eventKey={k}>{v[1][0]} {v[0]}</Nav.Link> </Nav.Item>;
                    })}
                </Nav>
                </Col>

            </Row>
            </Tab.Container>
            </Card>

        </Col>
        </Row>
*/