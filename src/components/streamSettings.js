//https://medium.com/@nazmifeeroz/how-to-use-react-usecontext-and-usestate-hooks-as-a-global-store-1b4f1898034f

import { createContext, useState, useReducer, useRef, useEffect } from 'react';
import { rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';


export const StreamSettings = createContext(null);

//To initialize data
 // eslint-disable-next-line import/no-anonymous-default-export
export default function({children})
{
    const videoRef                        = useRef(null);
    const [ devices , setDevices ]        = useState(null);
    const [ settings, setSettings ]       = useState(null);
    const [ resolutions, setResolutions ] = useState(null);
    const [ localStream, setLocalStream ] = useReducer( (value, newvalue)=>{
        if( videoRef && videoRef.current )
            videoRef.current.srcObject = newvalue;
        return newvalue;
    }, dummyStream.getStream() );

    const store = {
        videoRef,
        devices:     [ devices , setDevices ],
        settings:    [ settings, setSettings ], 
        resolutions: [ resolutions, setResolutions ],   
        localStream: [ localStream, setLocalStream ],
    }

    function onGotResolutions({resolutions})
    { 
        setResolutions(resolutions); 
    }
    
    function onGotDevices ({ audioDevices: audio, videoDevices: video, settings }) 
    { 
        setSettings(settings);
        setDevices({audio, video});
    }

    function onGotStream( {stream, settings})
    { 
        setSettings(settings);
        setLocalStream(stream);
        for( let callId in rtcClient.getCalls() )
        {
            //track.enabled = true;
            {
                let track = stream.getVideoTracks()[0];
                rtcClient.replaceLocalVideoTrack(callId, track);
            }
            {
                let track = stream.getAudioTracks()[0];
                rtcClient.replaceLocalAudioTrack(callId, track);
            }
        }
    }

    function onError({description}){
        console.error("Error:", description);
    }

    function onUnload(){
        mediaAdapter.off("got_stream",        onGotStream );
        mediaAdapter.off('got_devices',       onGotDevices );
        mediaAdapter.off("got_resolutions",   onGotResolutions );
        mediaAdapter.off("error_stream",      onError);
        mediaAdapter.off("error_devices",     onError);
    }

    useEffect(()=>{
        mediaAdapter.on("got_stream",         onGotStream );
        mediaAdapter.on('got_devices',        onGotDevices );
        mediaAdapter.on("got_resolutions",    onGotResolutions );
        mediaAdapter.on("error_stream",       onError);
        mediaAdapter.on("error_devices",      onError);
        mediaAdapter.getDevices();

        window.removeEventListener('unload ', onUnload);
        window.addEventListener('unload ',    onUnload);
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    return (<StreamSettings.Provider value={store}>{children}</StreamSettings.Provider>);
}
