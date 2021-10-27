import Page from "pages/page"
import {Row, Col} from 'react-bootstrap'
import {CanvasRenderer} from 'extra/canvasRenderer'
import { StreamSettings } from "components/streamSettings";
import { useRef, useEffect, useState, useContext, useReducer } from 'react'
import Video from 'components/video'
import Shader from "assets/shader.fs"

export default () => { //eslint-disable-line import/no-anonymous-default-export
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream], resolutions: [ resolutions, setResolutions ] } = useContext(StreamSettings);
    const canvasRef = useRef(null);
    let {current : ctx} = useRef(null);

    useEffect( ()=>{
        (async function(){
            ctx = new CanvasRenderer(canvasRef.current);

            var shader = await fetch(Shader).then( v => v.text() );
            ctx.setShader(shader);
            ctx.setUpdate(onUpdate);
        })();

        return ()=>{
            if(ctx){
                ctx.stop();
                ctx.setUpdate(null);
            } 
        }
    }, []);

    useEffect(()=>{
        let video;
        if(!ctx || !localStream) return;
        (async ()=>{
            video = document.createElement("video");
     
            video.muted         = true;
            video.width         = 320;
            video.height        = 240;
            video.autoplay      = true;
            video.playsinline   = true;
            video.src = video.srcObject = localStream;
            
            video.addEventListener('loadeddata', () => {
                if(video.readyState >= 2) {
                    video.play();
                    ctx.setSource(video);
                    ctx.start();
                }
            });
            
        })();

        return ()=>{
            video?.pause();
        }
    },[ctx, localStream]);

    function onUpdate(){
        ctx.setFloat("u_time", performance.now() * 0.001);
    }

    return <Page id="shader">
        <h1>Shader</h1>
        <Row>
            {/*<Col xs={6}><video autoPlay playsInline muted ref={videoRef} src={localStream}/></Col>*/}
            <Col xs={12}><canvas ref={canvasRef} /></Col>
        </Row>
        
        <style global jsx>{`
        #shader{
            video, canvas {
                object-fit: contain;
                width: 100%;
                height: 100%;
            }
        }
        `}</style>
    </Page>
}