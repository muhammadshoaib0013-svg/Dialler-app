import React from 'react';
import LoginForm from './components/Auth/LoginForm';
import MainDashboard from './components/Layout/MainDashboard';
import { useCallContext } from './context/CallContext';
import { AdminProvider } from './context/AdminContext';

function App() {
  const { isAuthenticated } = useCallContext();
  return isAuthenticated ? <MainDashboard /> : <LoginForm />;
}

export default App;
