import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Image, OverlayTrigger, Tooltip } from 'react-bootstrap';
import "./roomlist.scss";
import roomIcon from 'assets/img/room.png';
import userIcon from 'assets/img/user.png';


export default function RoomList({rooms}){
    return (
    <Container as="ul" id="room-list">
        <Row>
        {rooms.map( (v,k,a) => {
            return (
                <Col xs={12} key={k} className="mt-1 mb-1">
                    <Row as={Link} xs={12} key={k} to={`rooms/${v.id}`}>
                        <Col xs={"auto"}>
                            <Image className="room-icon" src={roomIcon} height="64px"/>
                        </Col>
                        <Col style={{paddingLeft: 0, textAlign:"left"}}>
                            <span>#{v.id}</span>
                            <OverlayTrigger
                                key={-1}
                                placement='auto-start'
                                overlay={<Tooltip id={`user-tooltip-${-1}`}>{v.master}</Tooltip>}
                            >
                                <Image className="user-icon" roundedCircle src={userIcon} height="48px" />
                                {/*TODO:fetch for user image from somewhere*/}
                            </OverlayTrigger>

                            {v.guests.map( (v,k,a) => {
                                
                                return (
                                    <OverlayTrigger
                                        key={k}
                                        placement='auto-start'
                                        overlay={<Tooltip id={`user-tooltip-${k}`}>{v}</Tooltip>}
                                    >
                                        <Image className="user-icon" roundedCircle src={userIcon} height="48px" />
                                        {/*TODO:fetch for user image from somewhere*/}
                                    </OverlayTrigger>
                                )
                            })}
                        </Col>
                    </Row>
                </Col>
            );
        })}
        </Row>

    </Container>);
}