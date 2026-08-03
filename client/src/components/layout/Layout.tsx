import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette'; // reuse previous, but ensure it imports from UI store

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}
