let items = {}

export default function Navbar({children, items})
{
    console.log('hola',Object.values(items));
    return(
        <>
        Admire Navbar
        <ul>
            {children}
            {Object.values(items).map( (v,k,a) => {
                return (<li key={k} onClick={v}> {k} </li>);
            })}
        </ul>
        </>
    );
}

