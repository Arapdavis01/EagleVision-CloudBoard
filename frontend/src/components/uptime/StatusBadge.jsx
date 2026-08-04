import React from 'react';

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
      status === 'up' ? 'bg-green-500/10 text-green-400' :
      status === 'down' ? 'bg-red-500/10 text-red-400' :
      'bg-gray-500/10 text-gray-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        status === 'up' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' :
        status === 'down' ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]' :
        'bg-gray-400'
      }`} />
      {status || 'unknown'}
    </span>
  );
}
