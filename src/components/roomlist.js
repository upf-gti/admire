import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Image, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
        <style global jsx>{`
            @import "variables.scss";

            #room-list{
                padding:0;
                color: white;
                list-style-type: none;
                    
                a {
                    background-color: $color1;
                    border-top: 1px solid $color2;
                    border-bottom: 1px solid $color2;
                }

                .room-icon {
                    filter: hue-rotate(166deg) 
                            brightness(0.9) 
                            saturate(0.5) 
                            contrast(1.1);
                    border-radius: 2px;
                }

                .user-icon
                {
                    margin-top: .5rem;
                }

                span{
                    position: absolute;
                    margin-top:2.5rem;

                    color:$color5;
                    font-family: $principal_font;
                    font-weight: bold;
                    text-shadow: rgba(0,0,0,.5) 5px 1px 10px;
                }
                

            }
        `}</style>
    </Container>);
}