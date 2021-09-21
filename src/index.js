import React, { useEffect, useState } from 'react';
import Helmet from 'react-helmet';
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/scss/bootstrap.scss';
import "bootstrap-icons/font/bootstrap-icons.css";
import "style.scss";

import toast, { Toaster } from 'react-hot-toast';

import ToastContext from 'components/toasts';
import StreamSettings from 'components/streamSettings';

import App from "views/app";


function ContextContainer({ children }) {
  useEffect(() => window.toast = toast, [])
  const [state, setState] = useState(0);

  return <>
    <Helmet>
      <link rel="preload" as="stylesheet" href="bootstrap-icons/font/bootstrap-icons.css"/>
    </Helmet>
    <ToastContext>

      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 2000,
        }}
      />
      <StreamSettings>
        {children}
      </StreamSettings>
    </ToastContext>
  </>
}

ReactDOM.render(
  <ContextContainer>
    <App />
  </ContextContainer>
  , document.getElementById('root')
);