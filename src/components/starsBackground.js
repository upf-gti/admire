/*
Author: Hermann Plass (hermann.plass@gmail.com)
starsBackground.js (c) 2021
Desc: description
Created:  2021-02-21T10:42:18.840Z
Modified: 2021-02-23T12:27:17.235Z
*/

import React from "react";
import "./starsBackground.css";

export default class starsBackground extends React.Component
{
    render()
    {
        return(
            <div style={{position:"absolute", left:0, top:0}} >
                <div id="stars" style={{animation: "animStar  50s linear infinite"}}/>
                <div id="stars2" style={{animation: "animStar 100s linear infinite"}}/>
                <div id="stars3" style={{animation: "animStar 150s linear infinite"}}/>
            </div>
        );
    }
}