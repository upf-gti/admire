
import { Link } from 'react-router-dom';
import {Container, Row, Col, Button, Image} from 'react-bootstrap';

import StarsBackground from 'components/starsBackground';
import astro from 'assets/img/astro.png';
import "./v404.scss";

export default function V404({title, description})
{
    return (<>
        <div id="error-page">
            <StarsBackground/>
            
            <div id="astro-container">
                <Image id="astro" src={astro}></Image>
            </div>
            
            <Row xs={12} id="error-container">
                <Row md="auto" id="title">404 Error:</Row> <Row id="subtitle">Page not found</Row>
                <Row>
                    <p>Don't panic, and make sure to watch your oxygen levels.</p>
                    <Link to="/" style={{paddingLeft:0}}>
                        <div className="btn btn-lg btn-outline-light"> Return to safety </div>
                    </Link>
                </Row>
            </Row>
        </div>

        {/*<StarsBackground/>
        <Container fluid="xs" className="text-center">
        <Row className="justify-content-md-center">
        <Col xs={12} lg={6} xl={4}>

            <h1 id="title">{title}</h1>
            <h3 id="description">{description}</h3>

            <div id="astro-container">
                <Image id="astro" src={astro}></Image>
            </div>

            <Row xs={12} id="error-container">
                <Row md="auto" id="title">404 Error:</Row> <Row id="subtitle">Page not found</Row>
                <Row>
                    <p>Don't panic, and make sure to watch your oxygen levels.</p>
                    <Link to="/" style={{paddingLeft:0}}>
                        <div className="btn btn-lg btn-outline-light"> Return to safety </div>
                    </Link>
                </Row>
            </Row>
            
            <div id="footer">

            </div>
        </Col>
        </Row>
    </Container>*/}
        
    </>);
}



