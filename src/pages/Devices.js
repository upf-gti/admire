import Page from "pages/page"
import { useContext, useState } from "react";
import Video from "components/video"
import { Container, Tab, Row, Col, Nav, Form, FloatingLabel, InputGroup, FormControl } from "react-bootstrap"
import { StreamSettings } from "components/streamSettings";
import { RTCEvent, rtcClient, appClient, mediaAdapter, dummyStream } from 'extra/bra';
import AudioGain from 'components/audioGain';

export default () => {
    const [test, setTest] = useState(false);
    const { videoRef, devices: [devices, setDevices], settings: [settings, setSettings], localStream: [localStream, setLocalStream] } = useContext(StreamSettings);

    return <Page>
        <Tab.Container defaultActiveKey="audio" >
            <Row className="pt-3 flex-column flex-md-row">
                <Col xs="auto" className="pb-3">
                    <Nav variant="pills" className="flex-row flex-md-column">
                        <Nav.Item><Nav.Link eventKey="audio"> Audio </Nav.Link></Nav.Item>
                        <Nav.Item><Nav.Link eventKey="video"> Video </Nav.Link></Nav.Item>
                    </Nav>
                </Col>
                <Col className="border-start">
                    <Tab.Content>
                        <Tab.Pane eventKey="audio">
                            <FloatingLabel controlId="floatingSelect" className="pb-3" label={<span> <i className="bi bi-mic" /> Audio devices</span>}>
                                <Form.Select value={settings?.audio ?? "None"} onChange={({ target }) => mediaAdapter.setAudio(target.value)}>
                                    {devices?.audio && Object.keys(devices?.audio).map((v, k) => {
                                        return <option key={k} value={v}>{v}</option>
                                    })}
                                </Form.Select>
                            </FloatingLabel>
                            <AudioGain stream={localStream} show={test} />

                        </Tab.Pane>
                        <Tab.Pane eventKey="video">
                            <FloatingLabel controlId="floatingSelect" className="pb-3" label={<span> <i className="bi bi-camera-video" /> Video devices</span>}>
                                <Form.Select value={settings?.video ?? "None"} onChange={({ target }) => mediaAdapter.setVideo(target.value)}>
                                    {devices?.video && Object.keys(devices?.video).map((v, k) => {
                                        return <option key={k} value={v}>{v}</option>
                                    })}
                                </Form.Select>
                            </FloatingLabel>
                            <Video id={"local"} stream={localStream ?? dummyStream.getStream()} local={true} />
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
        <style global jsx>{`
            @media (orientation: landscape){}
            @media (orientation: portrait){
                
            }
            #page-content{

            }
        `}</style>

    </Page>
}