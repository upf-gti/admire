import "./video.scss"
import { Badge, Button } from 'react-bootstrap';
import { useEffect, useRef } from 'react';

export default function Video({id, stream, pin, user, master, local,onClick, ...props}){

    let ref = useRef(null);
    const audioEnabled = stream.getAudioTracks().every( v => !!v.enabled );
    const videoEnabled = stream.getVideoTracks().every( v => !!v.enabled );

    useEffect(()=>{ 
        if(!stream || !ref?.current ) return;
        ref.current.srcObject = stream;

    },[stream]);

    return <div className="Video" key={id} {...props}>

        <video ref={ref} autoPlay playsInline muted={local} onClick={onClick}/>
        <div className="stream-status">
            <span> {id}  </span>
            <i className={`bi bi-mic-mute-fill ${audioEnabled?"":"active"}`}/>
            <i className={`bi bi-camera-video-off-fill ${videoEnabled?"":"active"}`}/>
        </div>

    </div>;
}