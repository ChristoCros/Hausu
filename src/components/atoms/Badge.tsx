import { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  active?: boolean;
}

export default function Badge({ children, active = false, className = '', ...props }: BadgeProps) {
  return (
    <div 
      className={`badge ${active ? 'badge-active' : 'badge-inactive'} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}
