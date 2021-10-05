import { useState, useContext, useEffect } from 'react';
import { Button, SplitButton, Dropdown, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { RTCEvent, rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';
import { StreamSettings } from 'components/streamSettings';

export default function DeviceButton({ tracks, selected, options, onSelect, onClick, icon_enabled, icon_disabled, variant, ...props }) {
    const [state, setState] = useState(0);
    const [isEnabled, setEnabled] = useState((tracks??[]).every( v => v.enabled ));
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream] } = useContext(StreamSettings);

    function forceRefresh() {
        setState(state + 1);
    };

    useEffect(() => {
    } , [settings, settings?.audio, settings?.video, devices?.audio, devices?.video]);
    
    const placement = "top";
    return (
 
        <SplitButton  {...props}
            size="lg"
            className="m-1"
            as={ButtonGroup}
            id={`dropdown-button-drop-up`}
            drop="up"
            variant={variant ?? "primary"}
            title={<i className={`bi ${isEnabled && selected !== "None" ? icon_enabled : icon_disabled}`} />}

            onClick={ ()=>{
                const enabled = (tracks??[]).every(track => { track.enabled = !isEnabled; return !!track.enabled;});
                setEnabled(enabled);
                if (onClick)
                    onClick(enabled);
            }}

            onSelect={(eventKey, event) => {
                let [option, set] = [event.currentTarget, Array.from(event.currentTarget.parentElement.children)];
                set.forEach(v => v.classList.remove("active"));
                option.classList.add("active");
                if (onSelect)
                    onSelect(option.getAttribute("value"), set);
            }}
        >
            {!options && <Dropdown.Item key={0} disabled eventKey={0}>No options available</Dropdown.Item>}
            {options && Object.entries(options).map(([id, value], k) => <Dropdown.Item key={k} eventKey={k} value={id} className={id === selected?"active":""}> {id} </Dropdown.Item>)}
            <Button size="sm" variant="outline-primary" style={{ marginLeft: "1rem" }} onClick={mediaAdapter.findDevices}><i className="bi bi-arrow-repeat"></i> Refresh</Button>
        </SplitButton>


    );
}