import React, {useState} from 'react';
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import "style.scss";

import ToastContext from 'components/toasts';
import StreamSettings from 'components/streamSettings';

import App from "views/app";

function ContextContainer({children}){
  const [state,setState] = useState(0);

  return <>
      <ToastContext  >
      <StreamSettings>
      {children}
      </StreamSettings>
      </ToastContext>
    </>
}

ReactDOM.render(
  <ContextContainer>
    <App/>
  </ContextContainer>
  ,document.getElementById('root')
);