import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [downProjects, setDownProjects] = useState([]);

  const checkStatuses = useCallback(async () => {
    try {
      const res = await api.get('/uptime/status');
      const down = res.data.filter(p => p.status === 'down');
      setDownProjects(down);
    } catch (err) {
      console.error('Failed to fetch statuses');
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
