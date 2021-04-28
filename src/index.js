import React from 'react';
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import "style.scss";

import StreamSettings from 'components/streamSettings'

import App from "views/app";

ReactDOM.render(
  <StreamSettings>
    <App/>
  </StreamSettings>
  ,document.getElementById('root')
);