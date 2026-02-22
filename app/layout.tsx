import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CommandPalette from '@/components/CommandPalette';
import ScrollProgress from '@/components/ScrollProgress';
import { getPersonalInfo } from '@/lib/api';

const inter = Inter({ subsets: ['latin'] });

const personalInfo = getPersonalInfo();

export const metadata: Metadata = {
  title: `${personalInfo.name} - ${personalInfo.title}`,
  description: personalInfo.bio,
  keywords: [
    'desarrollador fullstack',
    'desarrollador web',
    'React',
    'Next.js',
    'TypeScript',
    'Node.js',
  ],
  authors: [{ name: personalInfo.name }],
  openGraph: {
    title: `${personalInfo.name} - ${personalInfo.title}`,
    description: personalInfo.bio,
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ScrollProgress />
        <CommandPalette />
        <Navigation />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
