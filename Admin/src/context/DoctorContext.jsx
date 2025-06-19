import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const DoctorContext = createContext();

const DoctorContextProvider = ({ children }) => {
  const [dToken, setDToken] = useState(localStorage.getItem('dToken') || null);
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  const isTokenExpired = (token) => {
    if (!token) {
      console.log('No token provided in isTokenExpired');
      return true;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      const expiry = payload.exp * 1000;
      const isExpired = Date.now() > expiry;
      console.log('Token expired:', isExpired, 'Current time:', Date.now(), 'Expiry:', expiry);
      return isExpired;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  };

  const logout = () => {
    console.log('Logging out: Clearing dToken');
    setDToken(null);
    localStorage.removeItem('dToken');
    toast.info('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    navigate('/doctor/login');
  };

  useEffect(() => {
    console.log('dToken updated:', dToken);
    if (dToken && isTokenExpired(dToken)) {
      logout();
    } else if (dToken) {
      localStorage.setItem('dToken', dToken);
    } else {
      localStorage.removeItem('dToken');
    }
  }, [dToken]);

  return (
    <DoctorContext.Provider value={{ dToken, setDToken, backendUrl, logout }}>
      {children}
    </DoctorContext.Provider>
  );
};

export default DoctorContextProvider;