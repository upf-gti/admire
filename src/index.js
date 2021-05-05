import React from 'react';
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import "style.scss";

import ToastContext from 'components/toasts';
import StreamSettings from 'components/streamSettings';

import App from "views/app";

ReactDOM.render(

  <ToastContext>
  <StreamSettings>
    <App/>
  </StreamSettings>
  </ToastContext>
  
  ,document.getElementById('root')
);