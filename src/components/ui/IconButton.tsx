import { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export default function IconButton({ children, className = '', ...props }: IconButtonProps) {
  return (
    <button className={`icon-button ${className}`} {...props}>
      {children}
    </button>
  );
}
