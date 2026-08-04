import React from 'react';

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status === 'up' ? 'up' : status === 'down' ? 'down' : 'unknown'}`}>
      <span className={`w-2 h-2 rounded-full ${
        status === 'up' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' :
        status === 'down' ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]' :
        'bg-gray-400'
      }`} />
      {status || 'unknown'}
    </span>
  );
}
