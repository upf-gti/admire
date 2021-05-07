import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { useEffect, useState, useRef, useContext } from 'react';

import { Button, SplitButton, Dropdown, ButtonGroup } from 'react-bootstrap';

import {StreamSettings} from 'components/streamSettings';

export default function Video({id, local, fref, stream}){

    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);
    
    let ref = useRef(null);
    const [audioEnabled, setAudio]        = useState(null);
    const [videoEnabled, setVideo]        = useState(null);

    //if(local) 
    //ref = videoRef;

    useEffect(()=>{ 
        if(stream && ref && ref.current )
            ref.current.srcObject = stream;
    },[stream]);

    //style={{maxHeight:'33vh', width:'auto'}}
    return <>
        {/*<h1 style={{zIndex:2000}}>{id}</h1>*/}
        <video ref={ref} autoPlay muted={true} playsInline controls />

        {local && <div className='footer shadow' style={{zIndex:1000}}>
            <SplitButton
                key={0}
                size="lg"
                drop="up"
                as={ButtonGroup}
                id={`dropdown-button-drop-up`}
                variant="primary"
                title={<i className={`bi ${videoEnabled?"bi-camera-video-fill":"bi-camera-video-off-fill"}`}/>}
                toggleLabel=""
                //onClick={()=> setVideo(!videoEnabled)}
                onClick={ ()=> stream.getVideoTracks().forEach( track => {track.enabled = !track.enabled; setVideo(track.enabled);}) }

                onSelect={(eventKey,event)=>{ 
                    Array.from(event.currentTarget.parentElement.children).forEach((v,k,a)=>v.classList.remove("active"));
                    event.currentTarget.classList.add("active");
                    mediaAdapter.setVideo(event.currentTarget.getAttribute("value"));
                }}
            >
                {(!devices || !devices.video) && <Dropdown.Item key={0} disabled eventKey={0}>No options available</Dropdown.Item>}
                { devices && devices.video &&  Object.entries(devices.video).map((v,k,a)=>{
                    const [id,value] = v;
                    return <Dropdown.Item key={k} eventKey={k} value={id}> {id} </Dropdown.Item>
                    
                })}
            </SplitButton>

            <SplitButton
                key={1}
                size="lg"
                as={ButtonGroup}
                id={`dropdown-button-drop-up`}
                drop="up"
                variant="primary"
                title={<i className={`bi ${audioEnabled?"bi-mic-fill":"bi-mic-mute-fill"}`}/>}
                toggleLabel=""
                //onClick={()=>setAudio(!audioEnabled)}
                onClick={ ()=> stream.getAudioTracks().forEach( track => {track.enabled = !track.enabled; setAudio(track.enabled);}) }
                onSelect={(eventKey,event)=>{ 
                    Array.from(event.currentTarget.parentElement.children).forEach((v,k,a)=>v.classList.remove("active"));
                    event.currentTarget.classList.add("active");
                    mediaAdapter.setAudio(event.currentTarget.getAttribute("value"));
                }}
            >
                {(!devices || !devices.audio) && <Dropdown.Item key={0} disabled eventKey={0}>No options available</Dropdown.Item>}
                {  devices && devices.audio &&  Object.entries(devices.audio).map((v,k,a)=>{
                    const [id,value] = v;
                    return (<>
                        <Dropdown.Item key={k} eventKey={k} value={id} > {id} </Dropdown.Item>
                    </>);
                })}
            </SplitButton>
        </div>}
    </>;
}