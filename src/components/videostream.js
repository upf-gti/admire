/*
Author: Hermann Plass (hermann.plass@gmail.com)
video-preview.js (c) 2021
Desc: description
Created:  2021-04-21T12:53:49.657Z
Modified: 2021-04-22T15:09:28.128Z
*/
import {useState, useEffect } from 'react';
import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import {ButtonGroup, SplitButton, Button, Dropdown, DropdownButton, Container, Row, Col} from 'react-bootstrap';

import './videostream.scss';

export default function VideoStream({id, fref, local, devices, settings, resolutions})
{
    const [audioEnabled, setAudio]        = useState(null);
    const [videoEnabled, setVideo]        = useState(null);
    
    return (<Container className="videostream d-flex vh-100 justify-content-sm-center" style={{marginTop:"-4.5rem"}}>

            <div className="m-auto align-self-center">
        <Row>
            <video ref={fref}/>
        </Row>

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
                {(!devices || !devices.video || !Object.keys(devices.video).length) && <Dropdown.Item disabled eventKey={0}>No options available</Dropdown.Item>}
                {devices && devices.video &&  Object.entries(devices.video).map((v,k,a)=>{
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
                {(!devices || !devices.audio || !Object.keys(devices.audio).length) && <Dropdown.Item disabled eventKey={0}>No options available</Dropdown.Item>}
                {devices && devices.audio &&  Object.entries(devices.audio).map((v,k,a)=>{
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