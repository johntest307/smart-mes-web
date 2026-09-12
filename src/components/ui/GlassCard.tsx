import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "relative rounded-xl bg-surface border border-white/10",
      className
    )}>
      <div className="w-full h-full p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
