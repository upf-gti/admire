import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function RoomList({rooms}){
    return (<>
        {rooms.map( (v,k,a) => {
            return (
                <Link key={k} to={`rooms/${v.id}`}>
                    <li>{v.id}</li>
                </Link>);
        })}
    </>);
}