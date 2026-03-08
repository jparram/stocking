import { type ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
