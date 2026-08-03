import React from 'react';
import { cn } from '../../lib/utils';

export const Table = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-800">
    <table className={cn('w-full text-sm', className)}>{children}</table>
  </div>
);

export const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={cn('px-4 py-3 text-left font-medium text-gray-400 bg-gray-900', className)}>
    {children}
  </th>
);

export const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn('px-4 py-2.5 border-t border-gray-800', className)}>{children}</td>
);
