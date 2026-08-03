import { useState } from 'react';
import { Button } from '../ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  label: string;
  value?: string | null;
}

export function CredentialReveal({ label, value }: Props) {
  const [show, setShow] = useState(false);
  if (!value) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 w-32">{label}:</span>
      <code className="text-sm bg-gray-800 px-2 py-1 rounded">
        {show ? value : '••••••••'}
      </code>
      <button
        onClick={() => setShow(!show)}
        className="text-gray-500 hover:text-gray-300"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
