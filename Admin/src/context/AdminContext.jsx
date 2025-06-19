import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const AdminContext = createContext();

const AdminContextProvider = ({ children }) => {
    const [aToken, setAToken] = useState(localStorage.getItem('aToken') || '');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    const isTokenExpired = (token) => {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            return Date.now() > expiry;
        } catch (error) {
            console.error('Error decoding token:', error);
            return true;
        }
    };

    const logout = () => {
        setAToken('');
        localStorage.removeItem('aToken');
        toast.info('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        navigate('/login');
    };

    useEffect(() => {
        console.log('Backend URL:', backendUrl);
        if (!import.meta.env.VITE_BACKEND_URL) {
            console.warn('VITE_BACKEND_URL not set in .env. Using default:', backendUrl);
        }

        if (aToken && isTokenExpired(aToken)) {
            logout();
        } else if (aToken) {
            localStorage.setItem('aToken', aToken);
        } else {
            localStorage.removeItem('aToken');
        }

        setLoading(false);
    }, [aToken, backendUrl]);

    const value = {
        aToken,
        setAToken,
        backendUrl,
        logout,
        loading,
        isTokenExpired,
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export default AdminContextProvider;