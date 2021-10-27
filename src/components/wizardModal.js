import Helmet from 'react-helmet';
import { ToastContext } from 'components/toasts';
import { useRef, useState, useContext, useEffect } from 'react';
import { Modal, Button, Spinner, Image, Nav } from 'react-bootstrap';
import icon from 'assets/img/wizard2.png';
import Gesture from 'rc-gesture';
import 'react-slideshow-image/dist/styles.css'
import { Slide, goTo} from 'react-slideshow-image';
import toast from 'react-hot-toast';

export default function({show, setShow, callback}) {
    const ref = useRef(null);
    const Log = useContext(ToastContext);
    const [fetching, setFetching] = useState(0);//0: not fetching, 1: fetching, 2: sucess, 3: failed
    const [selected, setSelected] = useState(0);
    const [page, setPage] = useState(null);
    const [views, setViews] = useState([]);
    const pages = ["Devices","Position","Lighting","Shader" ];

    //use useEffect to fetch page views dynamically
    useEffect(() => {
        (async () => {
            let vs = [];
            for(let p of pages)
                await import(`pages/${p}.js`).then(v => vs.push(<v.default />))
            setViews( [...vs] );
            setPage(vs[selected]);
        })();
    }, []);

    useEffect(() => {
        setPage(views[selected]);
    }, [selected]);

    return <div
    onKeyDown={(e) => {
        switch(e?.keyCode)
        {
            //case 37: return ref.current?.goBack();
            //case 39: return ref.current?.goNext();
            case 37: return setSelected( s => (s-1 < 0)? pages.length-1 : s-1 );
            case 39: return setSelected( s => (s+1)%pages.length );
        }
    }} tabIndex="0"
    >
    <Gesture
            onSwipeLeft={ () => setSelected( s => (s+1)%pages.length ) } 
            onSwipeRight={() => setSelected( s => (s-1 < 0)? pages.length-1 : s-1 ) }
        >
        < Modal
            centered
            show={show}
            onHide={() => setShow(false)}
            keyboard={true}
            dialogClassName="modal-shadow-lg"
        >

           <Modal.Body>
                <ul className="nav nav-tabs justify-content-start">
                    { pages.map( (v,k) => <li key={k} className="nav-item">
                            <div className={`nav-link ${selected === k?"active":""}`} onClick={()=>setSelected(k)}>{v}</div>  
                    </li>)}
                </ul>
                {/*<Slide 
                    ref={ref} 
                    duration={0}
                    infinite={true}
                    autoplay={false} 
                    indicators={true} 
                    easing="cubic-out" 
                    defaultIndex={-1}
                    transitionDuration={150}
                >
                {views.map((p, index)=> (
                    <div key={index}>{p}</div>
                ))} 
                </Slide>*/}
                {page}
            </Modal.Body>

            <Modal.Footer className="justify-content-between p-0">
                <Modal.Title> 
                    <Image src={icon} alt="wizard icon" height="32" />
                    <span className="fw-bolder">Wizard</span>
                </Modal.Title>
                <Button variant="secondary" size="sm" className="m-2" onClick={() => setShow(false)}><i className="bi bi-x-circle"></i> Close</Button>
            </Modal.Footer>
        </Modal>
    </Gesture>
        <style global jsx>{`
            .modal-dialog {
                margin: auto;
                height: 100%;
                &:focus {
                    outline: none;
                }
            }
            .modal-content{
                margin-top:40px;
                //background:transparent;
                border-radius: 0 0 .3em .3em;
                min-width: 362px;
            }
            .modal-body{ 
                padding: 0;
            }
            .modal-header{
                border-bottom:0;
                .nav-tabs{
                    width: 100%;
                    .nav-link{
                        cursor: pointer;
                    }
                }
            }
            .nav-tabs{
                margin-top: -42px;

                .nav-link{
                    color:white;
                    user-select: none;
                    cursor: pointer;
                    &.active{
                        color:black;
                    }
                }
            }

            .nav-item{
                background: rgba(255,255,255,.15);
                border-radius: .3em .3em 0 0;
            }

            .default-nav{
                padding:0 !important; margin:0 !important;
            }

        `}</style>
    </div>;
}