import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// A simple setup to run the example.
// In a real app, you'd integrate this into your existing React application.

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element. This example needs a <div id='root'></div> in your HTML.");
} 
