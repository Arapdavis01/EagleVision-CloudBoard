import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/check')
      .then(res => setAdminId(res.data.adminId))
      .catch(() => setAdminId(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      await api.post('/auth/login', { email, password });
      const res = await api.get('/auth/check');
      setAdminId(res.data.adminId);
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      toast.error(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAdminId(null);
      navigate('/login');
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
      Loading...
    </div>
  );

  return (
    <AuthContext.Provider value={{ adminId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
