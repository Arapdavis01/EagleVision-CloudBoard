import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, DollarSign, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-white p-4">
      <h1 className="text-xl font-bold mb-8 flex items-center gap-2">
        <span>🦅</span> EagleVision
      </h1>
      <nav className="space-y-2 flex-1">
        <NavLink to="/" className={({ isActive }) => `flex items-center gap-2 p-2 rounded hover:bg-gray-800 ${isActive ? 'bg-gray-800' : ''}`}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `flex items-center gap-2 p-2 rounded hover:bg-gray-800 ${isActive ? 'bg-gray-800' : ''}`}>
          <FolderKanban size={18} /> Projects
        </NavLink>
        <NavLink to="/finance" className={({ isActive }) => `flex items-center gap-2 p-2 rounded hover:bg-gray-800 ${isActive ? 'bg-gray-800' : ''}`}>
          <DollarSign size={18} /> Finance
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => `flex items-center gap-2 p-2 rounded hover:bg-gray-800 ${isActive ? 'bg-gray-800' : ''}`}>
          <AlertTriangle size={18} /> Alerts
        </NavLink>
      </nav>
      <button onClick={logout} className="flex items-center gap-2 p-2 text-sm hover:bg-red-700/50 rounded transition-colors mt-auto">
        <LogOut size={16} /> Sign Out
      </button>
    </aside>
  );
}
