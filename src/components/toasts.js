/*
Author: Hermann Plass (hermann.plass@gmail.com)
toast.js (c) 2021
Desc: description
Created:  2021-05-04T14:10:47.108Z
Modified: 2021-05-04T15:49:39.655Z
https://blog.logrocket.com/how-to-create-a-custom-toast-component-with-react/
*/
import { useState, useEffect, createContext, useContext } from 'react';
import { Toast, ToastBody, Button } from 'react-bootstrap';

export const ToastContext = createContext(null);

export default function ({children}){
    let id = 0;

    const testlist = [{
        id: 1,
        type: 'Success',
        show:true,
        description: 'This is a success toast component',
        backgroundColor: '#5cb85c',
      },
      {
        id: 2,
        type: 'Error',
        show:true,
        description: 'This is an error toast component',
        backgroundColor: '#d9534f',
      }];

    const [list, setList] = useState(testlist);
    
    useEffect(() => {
        setList(list);
    }, [list]);

    const store = {
        toasts: [list, setList],
        error: error,
        log: log
    }

    function log(description)
    {
        list.push({id:++id, show:true, type:"Success",description})
    }

    function error(description)
    {
        list.push({id:++id, show:true, type:"Error",description})
    }



    return (<ToastContext.Provider value={store}>{children}</ToastContext.Provider>);
}

export function Toasts(){

    const { toasts: [list, setList] } = useContext(ToastContext);

    useEffect(() => {
        setList(list);
    }, [list]);
    
    function hideToast(id){
        let toast = list.find(v=>v.id === id);
        if(toast)
            toast.show = false;

        setList(list);
    }

    let i = 0;
    return(<>
        <div id="notification-container" style={{
            position: 'absolute',
            top: 0,
            right: 0,
        }}>
            {
                list.map((v,k,a)=>{
                    return <>
                    <Toast key={++i} show={v.show === true} autohide delay={3000} onClose={()=>hideToast(v.id)} className={`${v.type==="Success"?"bg-primary":"bg-danger"}`}>
                    <Toast.Body>{v && v.description}</Toast.Body>
                    </Toast>
                        {/*<div key={++i} class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="d-flex">
                            <div class="toast-body">
                                hola {v && v.description}
                            </div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                        </div>*/}

                        {/*<Toast delay={3000} autohide key={++i} onClose={ ()=>hideToast(v.id) } className={`align-items-center text-white ${v.type==="Success"?"bg-primary":"bg-danger"} border-0`} role="alert" aria-live="assertive" aria-atomic="true">
                            <div class="d-flex">
                                <Toast.Body>    {v && v.description}  </Toast.Body>
                                <Button className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"/>
                                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                            </div>
                        </Toast>*/}

                        {/*<div key={++i} className={`notification toast ${position}`} >
                            <button>X</button>
                            <div className="notification-image">
                                <img src={toast.icon} alt="" />
                            </div>
                            <div>
                                <p className="notification-title">{toast.title}</p>
                                <p className="notification-message">
                                    {toast.description}
                                </p>
                            </div>
                        </div>*/}
                    </>;
                })
            }
        </div>
    </>);
}

/*
<div class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
  <div class="d-flex">
    <div class="toast-body">
      Hello, world! This is a toast message.
    </div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
  </div>
</div>
*/