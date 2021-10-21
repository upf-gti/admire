import {useEffect, useRef, useState} from 'react';
let time = performance.now();

export default({stream, show}) => {
    let [ctx,setCtx] = useState(null);
    let [analyser,setAnalyser] = useState(null);
    let [microphone,setMicrophone] = useState(null);
    let [javascriptNode,setJavascriptNode] = useState(null);
    let [vol, setVol] = useState(0);
    const ref = useRef();
    
    window.ctx = ctx;
    useEffect(()=>{
        /*if(ctx){
            ctx.close();
            javascriptNode = undefined;
        }
        time = performance.now();*/

        ctx            = new AudioContext();
        analyser       = ctx.createAnalyser();
        microphone     = ctx.createMediaStreamSource(stream);
        javascriptNode = ctx.createScriptProcessor(256, 1, 1);
      
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
      
        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(ctx.destination);
        javascriptNode.onaudioprocess = onAudioProcess;

        setCtx(ctx);setAnalyser(analyser);setMicrophone(microphone);setJavascriptNode(javascriptNode);
    }, [stream]);

    useEffect(()=>{
        if(!ctx) return;
        console.log("gainEnabled:",show)
        switch(show){
            case true:return ctx.resume();
            case false: return ctx.suspend();
        }
    }, [show]);

    function onAudioProcess(){
        if(performance.now() - time < 24 ) return;
        time = performance.now();

        var array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        var values = 0;
        const avg = array.reduce((a,b) => a + b, 0) / array.length;
        
        let v = .75;
        //console.log(avg);
        setVol(a => Math.round(a * (1-v) + avg * v));
    }


    return <>
        <div className="pids-wrapper" ref={ref}>{
            Array.from({length:10},(v,i)=>{
                return <div key={i} className={`pid`} style={{background:  (i*10)<vol? '#69ce2b':'#e6e7e8'}}></div>
            })
        }
        </div>
        <style global jsx>{`
            .pids-wrapper{
                width: 100%;
            }
            .pid{
                width: calc(10% - 10px);
                height: 10px;
                display: inline-block;
                margin: 5px;
            }
        `}</style>
    </>;
}