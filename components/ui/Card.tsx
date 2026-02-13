import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200',
        hover && 'hover:shadow-lg hover:border-primary/20',
        className
      )}
    >
      {children}
    </div>
  );
}
