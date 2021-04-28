/*
Author: Hermann Plass (hermann.plass@gmail.com)
video-preview.js (c) 2021
Desc: description
Created:  2021-04-21T12:53:49.657Z
Modified: 2021-04-22T15:09:28.128Z
*/
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { useState, useEffect, useRef, useContext } from 'react';
import { ButtonGroup, SplitButton, Button, Dropdown, DropdownButton, Container, Row, Col } from 'react-bootstrap';

import {StreamSettings} from 'components/streamSettings';
import './videostream.scss';

export default function VideoStream({id, fref, stream, local})
{
    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);

    const ref = useRef(null);
    const [audioEnabled, setAudio]        = useState(null);
    const [videoEnabled, setVideo]        = useState(null);

    useEffect(()=>{
        if(stream) ref.current.srcObject = stream; 
    },[stream]);

    return (
        <Container className="videostream d-flex justify-content-xs-center">
            <div className="m-auto align-self-center">
            <Row><video ref={fref ?? ref} autoPlay muted playsInline/></Row>

        {local && <Row className="mt-2 justify-content-sm-center" noGutters>
            <Col xs="auto">
            <SplitButton
                size="lg"
                drop="up"
                as={ButtonGroup}
                id={`dropdown-button-drop-up`}
                variant="outline-primary"
                title={<i className={`bi ${videoEnabled?"bi-camera-video-fill":"bi-camera-video-off-fill"}`}/>}
                toggleLabel=""
                onClick={()=>setVideo(!videoEnabled)}
                onSelect={(eventKey,event)=>{ 
                    Array.from(event.currentTarget.parentElement.children).forEach((v,k,a)=>v.classList.remove("active"));
                    event.currentTarget.classList.add("active");
                    mediaAdapter.setVideo(event.currentTarget.getAttribute("value"));
                }}
            >
                {(!devices || !devices.video || !Object.keys(devices.video).length) && <Dropdown.Item key={0} disabled eventKey={0}>No options available</Dropdown.Item>}
                { devices && devices.video &&  Object.entries(devices.video).map((v,k,a)=>{
                    const [id,value] = v;
                    return (<>
                        <Dropdown.Item key={k} eventKey={k} value={id}> {id} </Dropdown.Item>
                    </>);
                })}
            </SplitButton>
            </Col>

            <Col xs="auto">
            <SplitButton
                size="lg"
                as={ButtonGroup}
                id={`dropdown-button-drop-up`}
                drop="up"
                variant="outline-primary"
                title={<i className={`bi ${audioEnabled?"bi-mic-fill":"bi-mic-mute-fill"}`}/>}
                toggleLabel=""
                onClick={()=>setAudio(!audioEnabled)}
                onSelect={(eventKey,event)=>{ 
                    Array.from(event.currentTarget.parentElement.children).forEach((v,k,a)=>v.classList.remove("active"));
                    event.currentTarget.classList.add("active");
                    mediaAdapter.setAudio(event.currentTarget.getAttribute("value"));
                }}
            >
                {(!devices || !devices.audio || !Object.keys(devices.audio).length) && <Dropdown.Item key={0} disabled eventKey={0}>No options available</Dropdown.Item>}
                {  devices.audio &&  Object.entries(devices.audio).map((v,k,a)=>{
                    const [id,value] = v;
                    return (<>
                        <Dropdown.Item key={k} eventKey={k} value={id} > {id} </Dropdown.Item>
                    </>);
                })}
            </SplitButton>
            </Col>
        </Row>}

        
        </div>
    </Container>);
}