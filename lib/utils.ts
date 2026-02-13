import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateRange(start: string, end?: string): string {
  const startDate = formatDate(start);
  if (!end) {
    return `${startDate} - Presente`;
  }
  const endDate = formatDate(end);
  return `${startDate} - ${endDate}`;
}
