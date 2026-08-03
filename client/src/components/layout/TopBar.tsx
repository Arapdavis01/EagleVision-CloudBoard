import { useLogout } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { useUIStore } from '../../store/uiStore';
import { LogOut, Search } from 'lucide-react';

export default function TopBar() {
  const logout = useLogout();
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950/80 backdrop-blur px-4">
      <div className="flex items-center gap-3">
        <span className="font-bold text-brand-400">EagleVision</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="text-gray-500 hover:text-gray-300 gap-2"
        >
          <Search size={15} />
          <span className="hidden md:inline">⌘K</span>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
          <LogOut size={15} className="mr-1" /> Exit
        </Button>
      </div>
    </div>
  );
}
