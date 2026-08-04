import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, DollarSign, AlertTriangle } from 'lucide-react';

export default function MobileNav() {
  const linkClass = ({ isActive }) => `flex flex-col items-center text-xs ${isActive ? 'text-blue-400' : ''}`;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white flex justify-around py-2 border-t border-gray-800 z-50">
      <NavLink to="/" className={linkClass}><LayoutDashboard size={20} /> Home</NavLink>
      <NavLink to="/projects" className={linkClass}><FolderKanban size={20} /> Projects</NavLink>
      <NavLink to="/finance" className={linkClass}><DollarSign size={20} /> Finance</NavLink>
      <NavLink to="/alerts" className={linkClass}><AlertTriangle size={20} /> Alerts</NavLink>
    </nav>
  );
}
