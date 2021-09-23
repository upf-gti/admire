import { useEffect } from 'react';
import { ButtonGroup, SplitButton, Dropdown } from 'react-bootstrap';

export default ({onSelectCallback, onClickCallback, devices, ...props}) => {

    useEffect(() => {}, [devices])

    return (<>
        <SplitButton size="lg" drop="up" as={ButtonGroup} 
            id={`dropdown-button-drop-up`}
            variant="primary"
            toggleLabel=""
            onSelect={(key, event) => {
                let [option, set] = [event.currentTarget, Array.from(event.currentTarget.parentElement.children)];
                set.forEach(v => v.classList.remove("active"));
                option.classList.add("active");
                if(onSelectCallback)
                    onSelectCallback(option, set);
            }}
            onClick={()=>{
                if(devices && onClickCallback )
                    onClickCallback();
            }}
            {...props}
        >
            {!devices && <Dropdown.Item key={0} disabled eventKey={0}>No options available</Dropdown.Item>}
            { devices && Object.entries(devices).map( ([id, value], k) => <Dropdown.Item key={k} eventKey={k} value={id} > {id} </Dropdown.Item>)}
        </SplitButton>
    </>);
}