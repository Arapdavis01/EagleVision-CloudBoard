import React from 'react';
import { useAlerts } from '../../contexts/AlertContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function RedBanner() {
  const { downProjects } = useAlerts();
  const navigate = useNavigate();
  if (downProjects.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 text-sm flex justify-between items-center cursor-pointer shadow-lg"
        onClick={() => navigate('/alerts')}
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {downProjects.length} project(s) down
        </span>
        <span className="underline hover:no-underline">View →</span>
      </motion.div>
    </AnimatePresence>
  );
}
