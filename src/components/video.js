import { Badge, Button } from 'react-bootstrap';
import { useEffect, useRef } from 'react';

export default function Video({ id, stream, pin, user, master, local, onClick, ...props }) {
    
    let ref = useRef(null);
    const audioEnabled = stream.getAudioTracks().every(v => !!v.enabled);
    const videoEnabled = stream.getVideoTracks().every(v => !!v.enabled);

    useEffect(() => {
        if (!stream || !ref?.current) return;
        ref.current.srcObject = stream;
    }, [stream]);

    return <div className="Video" key={id} {...props}>

        <video ref={ref} autoPlay playsInline muted={local} onClick={onClick} />
        <div className="stream-status">
            <span> {id}  </span>
            <i className={`bi bi-mic-mute-fill ${audioEnabled ? "" : "active"}`} />
            <i className={`bi bi-camera-video-off-fill ${videoEnabled ? "" : "active"}`} />
        </div>
        <style global jsx>{`
            @import 'variables.scss';

            .Video
            {
                video{ 
                    width: 100%;
                    padding:0;
                    margin: 0;
                    border-radius: 4px;
                    border:1px solid $color3;
                    min-width:100%;
                    min-height:100%;
                    height: 100%;
                    object-fit: cover !important;
                }

                .dropup > .btn{
                    padding: 0.5rem 1.2rem;
                    font-size: 2rem;
                    border-radius: 10.3rem !important;
                    text-align: center;
                    margin: 0 .5rem;
                }

                .bi::before{
                    margin-left: 0;
                    margin-right: -2px;
                    margin-top: 5px;
                }

                .dropdown-toggle-split
                {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    
                    width:20px;
                    height:26px;
                    padding: .5rem 1rem !important;
                    padding-right: .75rem !important;
                    padding-left: .75rem !important;

                    border-radius:50%;
                    background-color: white;
                    z-index: 100;
                    color:gray;
                }

                .dropdown-toggle-split::after, .dropend .dropdown-toggle-split::after, .dropup .dropdown-toggle-split::after
                {
                    margin-left: -7px;
                    position: relative;
                    top: -20px;
                    bottom: 20px;
                    font-size: x-large;
                }

                .stream-status
                {
                    color:white;
                    padding:5px;
                    text-align: left;
                    margin-top: -40px;
                    position: relative;
                    text-shadow: 0 0 1px rgba(0,0,0,.5);
                    .bi
                    {
                        width: 30px;
                        display: none;
                        position:relative;
                        top:1px;
                        margin: 0 .25rem;

                        &:hover{
                            filter: inherit;
                            transition: all .25s;
                        }

                        &.active{
                            display: initial;
                        }
                    }
                }



                .stream-status,.stream-forward{
                    .badge{
                        cursor: pointer;
                        padding: 0.45em 0.25em;
                    }
                }

            }

        `}</style>
    </div>;
}