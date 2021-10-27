import Page from "pages/page"
import { useContext, useState } from "react";
import Video from "components/video"
import { Container, Tab, Row, Col, Nav, Form, FloatingLabel, InputGroup, FormControl } from "react-bootstrap"
import { StreamSettings } from "components/streamSettings";
import { RTCEvent, rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';
import AudioGain from 'components/audioGain';

export default () => { //eslint-disable-line import/no-anonymous-default-export

    const [test, setTest] = useState(false);
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream], resolutions: [ resolutions, setResolutions ] } = useContext(StreamSettings);

    return  <Page>
                <Row>
                    <Col xs={12} sm={5} className="pb-2">
                        <Video id={"local"} stream={localStream ?? dummyStream.getStream()} local={true} />
                    </Col>

                    <Col xs={12} sm={7}>
                        <FloatingLabel className="pb-1" controlId="floatingSelect" label={<span> <i className="bi bi-camera-video" /> Video devices</span>}>
                        <Form.Select value={settings?.video ?? "None"} onChange={({ target }) => {
                            mediaAdapter.setVideo(target.value);
                        }}>
                        {devices?.video && Object.keys(devices?.video).map((v, k) => <option key={k} value={v}>{v}</option>)}
                        </Form.Select>
                        </FloatingLabel>

                        {<FloatingLabel className="pb-1" controlId="floatingSelect" label={<span> <i className="bi bi-camera-video" /> Video resolutions</span>}>
                        <Form.Select value={settings?.resolution ?? "Undefined"} onChange={({target}) => {
                            mediaAdapter.setVideo(settings?.video ?? "None", target.value);
                        }}>
                        {resolutions && Object.keys(resolutions).map((v, k) => <option key={k} value={v}>{v}</option>)}
                        </Form.Select>
                        </FloatingLabel>}

                        <FloatingLabel className="pb-1" controlId="floatingSelect" label={<span> <i className="bi bi-mic" /> Audio devices</span>}>
                        <Form.Select value={settings?.audio ?? "None"} onChange={({ target }) => mediaAdapter.setAudio(target.value)}>
                        {devices?.audio && Object.keys(devices?.audio).map((v, k) => <option key={k} value={v}>{v}</option>)}
                        </Form.Select>
                        </FloatingLabel>
                        
                        <AudioGain stream={localStream} show={test} />
                    </Col>
                </Row>

        
        <style global jsx>{`
            @media (orientation: landscape){}
            @media (orientation: portrait){
                
            }
            #page-content{

            }
        `}</style>

    </Page>
}