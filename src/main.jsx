import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { CallProvider } from './context/CallContext.jsx'
import { AdminProvider } from './context/AdminContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CallProvider>
      <AdminProvider>
        <App />
      </AdminProvider>
    </CallProvider>
  </React.StrictMode>,
)
