import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'
import { CallProvider } from './context/CallContext.jsx'
import { AdminProvider } from './context/AdminContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <CallProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </CallProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
