import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // <--- THIS IS THE CRITICAL LINE THAT WAS LIKELY MISSING

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)