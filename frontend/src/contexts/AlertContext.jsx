import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [downProjects, setDownProjects] = useState([]);

  const checkStatuses = useCallback(async () => {
    try {
      const res = await api.get('/uptime/status');
      // Ensure we have an array and filter safely
      const down = Array.isArray(res.data)
        ? res.data.filter(p => p && p.status === 'down')
        : [];
      setDownProjects(down);
    } catch (err) {
      // Silently fail – don't let the UI crash
      console.error('Alert check failed', err);
    }
  }, []);

  useEffect(() => {
    checkStatuses();
    const interval = setInterval(checkStatuses, 60000);
    return () => clearInterval(interval);
  }, [checkStatuses]);

  return (
    <AlertContext.Provider value={{ downProjects }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => useContext(AlertContext);
