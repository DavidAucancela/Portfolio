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
        'rounded-xl border border-gray-200 dark:border-gray-800',
        'bg-white dark:bg-gray-900',
        'p-6 shadow-sm transition-all duration-200',
        hover && 'hover:shadow-lg hover:border-primary/30 dark:hover:border-primary/20 hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}
