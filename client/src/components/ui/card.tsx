import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('rounded-xl bg-gray-900 border border-gray-800 p-5', className)}>
    {children}
  </div>
);
