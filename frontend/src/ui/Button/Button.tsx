import React from 'react';

import './Button.css';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  children: React.ReactNode;
};

export const Button = ({ children, variant = 'primary', ...props }: ButtonProps) => {
  return (
    <button className="btn" {...props}>
      {children}
    </button>
  );
};

