import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import RedBanner from './RedBanner';
import CommandPalette from './CommandPalette';

export default function Layout() {
  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <RedBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-16 md:pb-6">
          <Outlet />
        </main>
        <MobileNav />
      </div>
      <CommandPalette />
    </div>
  );
}
