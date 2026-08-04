import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, DollarSign, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-900/60 backdrop-blur-md border-r border-white/5 p-5">
      <div className="flex items-center gap-2 mb-10">
        <span className="text-2xl">🦅</span>
        <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          EagleVision
        </span>
      </div>
      <nav className="space-y-1 flex-1">
        <NavLink to="/" className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderKanban size={18} /> Projects
        </NavLink>
        <NavLink to="/finance" className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <DollarSign size={18} /> Finance
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={18} /> Alerts
        </NavLink>
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-2.5 mt-4 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
      >
        <LogOut size={16} /> Sign Out
      </button>
    </aside>
  );
}
