    import { rtcClient, appClient, mediaAdapter } from 'extra/bra';
import { useEffect, useState, useRef, useContext } from 'react';

import { Button  } from 'react-bootstrap';

import {StreamSettings} from 'components/streamSettings';
import "./video.scss"

export default function Video({id, user, master, local, fref, stream, setLiveCallback, style}){

    const { videoRef, devices:[devices,setDevices], settings:[settings,setSettings], localStream:[localStream,setLocalStream] } = useContext(StreamSettings);
    
    let ref = useRef(null);
    const [audioEnabled, setAudio] = useState(settings && settings.audio && settings.audio !== 'None');
    const [videoEnabled, setVideo] = useState(settings && settings.video && settings.video !== 'None');

    useEffect(()=>{ 
        if(!settings) return;
        setAudio(settings.audio && settings.audio !== 'None');
        setVideo(settings.video && settings.video !== 'None');
    },[settings?.audio, settings?.video]);

    useEffect(()=>{ 
        if(stream && ref && ref.current )
            ref.current.srcObject = stream;
    },[stream]);

    //style={{maxHeight:'33vh', width:'auto'}}
    return <div key={id} className="Video" style={style} >
        {/*<h1 style={{zIndex:2000}}>{id}</h1>*/}
        
        {/*<div className="stream-status">
            <i className={`bi bi-mic-mute-fill ${audioEnabled?"":"active"}`}/>
            <i className={`bi bi-camera-video-off-fill ${videoEnabled?"":"active"}`}/>
        </div>*/}

        <video ref={ref} autoPlay playsInline muted={local}/>
        
        {/*<div className="stream-controls">
            {!local && !audioEnabled && <i className={`bi ${audioEnabled?"bi-volume-up-fill":"bi-volume-mute-fill"}`} onClick={ ()=> stream.getAudioTracks().forEach( track => {track.enabled = !track.enabled; setAudio(track.enabled);}) }/> }
            {!local && user.id === master && <button className="live-btn" onClick={(e)=>{ setLiveCallback(); e.currentTarget.classList.toggle('active'); }}> Live </button>}
        </div>*/}
        

        
    </div>;
}