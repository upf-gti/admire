
import { Link } from 'react-router-dom';
import {Container, Row, Col, Button, Image} from 'react-bootstrap';

import StarsBackground from 'components/starsBackground';
import astro from 'assets/img/astro.png';

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

        <style global jsx>{`
            #error-page {
                display: flex;
                align-items: flex-end;
                
                background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);

                width: 100%; 
                height: 100%;
                position: absolute;
                left: 0;
                top: 0;
                padding:3rem;
                
                color:hsl(210, 11%, 85%)
            }

            #error-page #title{
                font-family: Montserrat;
                font-weight: 800;
                font-size:2rem;
            }

            #error-page #subtitle{
                font-family: Montserrat;
                font-weight: 50;
                font-size:3.4rem;
            }

            #error-page p{
                font-family: Lato;
                font-weight: 50;
                font-size: 1.7rem;
                padding-left:0;
                max-width:25rem;
            }

            #error-page #error-container
            {
                background: rgba(0,0,0,0.6);
                z-index: 3;
                padding: 2rem;
                border: 20px solid rgba(255,255,255, 0.9);
                margin: -7px;
            }



            #astro-container
            {
                position: absolute;
                top: 1rem;
                right: 1rem;
            }

            #astro
            {
                filter: saturate(.5);
                image-rendering: optimizeSpeed; 
                -moz-osx-font-smoothing: grayscale;
                -webkit-font-smoothing: antialiased;
            }

            @media (prefers-reduced-motion: no-preference) {
                #astro-container{
                    animation:slide infinite 600s linear;
                }
                
                #astro {
                    animation: spin infinite 275s linear ;
                }
            }

            @keyframes slide {
                0% {
                    transform: translate(0vw, 0vh);
                }
                33% {
                    transform: translate(-65vw, 50vh);
                }
                66% {
                    transform: translate(-33vw, 65vh);
                }
                100% {
                    transform: translate(0vw, 0vh);
                }
            }    
        `}</style>
        
    </>);
}



