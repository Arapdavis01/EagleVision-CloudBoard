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
        className="bg-red-600 text-white px-4 py-2 text-sm flex justify-between items-center cursor-pointer"
        onClick={() => navigate('/alerts')}
      >
        <span className="flex items-center gap-2">
          <span className="animate-pulse">🔴</span>
          {downProjects.length} project(s) down
        </span>
        <span className="underline">View →</span>
      </motion.div>
    </AnimatePresence>
  );
}
