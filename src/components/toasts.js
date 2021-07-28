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
import toast from 'react-hot-toast';

export const ToastContext = createContext(null);

let id = 0;

 // eslint-disable-next-line import/no-anonymous-default-export
export default function ({children}){
    const [list, setList] = useState([]);

    function info(description)
    {
        console.log(`%c Info %c: ${description}`, "background-color:cyan; color:black; font-weight: bolder;", 'color:white');
        toast(`${description}`, {icon:'📣'})
        //setList([...list,{id:++id, show:true, type:"Info",description}]);
    }

    function error(description)
    {
        console.log(`%c Error %c: ${description}`, "background-color:red; color:white", 'color:white');
        //setList([...list, {id:++id, show:true, type:"Error",description}]);
        toast(`${description}`, {icon:'👎', style:{ background:'#DC143C'}});
    }

    function warn(description)
    {
        console.warn(`%c Warn %c: ${description}`, "background-color:orange; color:black", 'color:white');
        //setList([...list, {id:++id, show:true, type:"Warn",description}]);

        toast(`${description}`, {icon:'⚠️', style:{background:'#FFA500'}})
    }

    function success(description)
    {
        console.log(`%c Success %c: ${description}`, "background-color:green", 'color:white');
        //setList([...list, {id:++id, show:true, type:"Success",description} ]);
        toast.success(`${description}`, {icon:'👍'})
    }

    function promise(promise, success, error)
    {
        toast.promise(promise, {
            loading: 'Processing...', 
            success: (s) => { console.log(s); return (s??'Success!'); }, 
            error:   (e) => { console.error(e); return (`Error:${e}`); }
        },
        {
            style: {
              minWidth: '250px',
            },
            loading: {icon: '📤'},
            success: {icon: '👍'},
            error:   {icon: '👎'},
        });
    }

    const store = {
        //toasts: [list, setList],
        promise,
        success,
        error,
        info,
        warn,
    }

    return (<ToastContext.Provider value={store}>{children}</ToastContext.Provider>);
}