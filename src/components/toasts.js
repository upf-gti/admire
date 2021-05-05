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

let id = 0;

export default function ({children, updateApp}){
    const [list, setList] = useState([]);

    function info(description)
    {
        console.log(`%c Info %c: ${description}`, "background-color:cyan; color:black; font-weight: bolder;", 'color:white');
        setList([...list,{id:++id, show:true, type:"Info",description}]);
    }

    function error(description)
    {
        console.log(`%c Error %c: ${description}`, "background-color:red; color:white", 'color:white');
        setList([...list, {id:++id, show:true, type:"Error",description}]);
    }

    function warn(description)
    {
        console.warn(`%c Warn %c: ${description}`, "background-color:orange; color:black", 'color:white');
        setList([...list, {id:++id, show:true, type:"Warn",description}]);
    }

    function success(description)
    {
        console.log(`%c Success %c: ${description}`, "background-color:green", 'color:white');
        setList([...list, {id:++id, show:true, type:"Success",description} ]);
    }

    const store = {
        toasts: [list, setList],
        success,
        error,
        info,
        warn,
    }

    return (<ToastContext.Provider value={store}>{children}</ToastContext.Provider>);
}

export function Toasts(){

    const { toasts: [list, setList] } = useContext(ToastContext);
    
    function hideToast(id){
        let toast = list.find(v=>v.id === id);
        if(toast)
            toast.show = false;

        setList([...list]);
    }

    let i = 0;
    return(<>
        <div id="notification-container" style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex:1000,
        }}>
            {
                list.map((v,k,a)=>{

                    const types = {
                        Success: 'bg-success', 
                        Error: 'bg-danger',
                        Info: 'bg-info',
                        Warn: 'bg-warning'
                    }
                    return <Toast  key={ v.id } show={v.show} autohide delay={3000} onClose={ ()=> { hideToast(v.id) }} className={`${types[v.type] ?? '.bg-light'} mb-1 shadow`}>
                                <div className="d-flex" id={v.id}>
                                    <Toast.Body >{v && v.description}</Toast.Body>
                                    <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onClick={ ()=> { hideToast(v.id) }}/>
                                </div>
                            </Toast>
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