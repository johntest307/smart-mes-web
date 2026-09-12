import React from 'react';
import ReactDOM from 'react-dom/client';
// import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

// const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '226084644706-g1atks9g41iivnoskhobv7u5v2rh28l7.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* <GoogleOAuthProvider clientId={CLIENT_ID}> */}
      <App />
    {/* </GoogleOAuthProvider> */}
  </React.StrictMode>,
);
