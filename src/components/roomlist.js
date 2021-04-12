import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function RoomList({rooms}){
    return (<>
        {rooms.map( (v,k,a) => {
            return (
                <Link to={`rooms/${v.id}`}>
                    <li key={k}>{v.id}</li>;
                </Link>);
        })}
    </>);
}