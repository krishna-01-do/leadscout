import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { branding } from '@/lib/branding';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `${branding.name} — ${branding.tagline}`,
  description: branding.description,
  openGraph: {
    title: `${branding.name} — ${branding.tagline}`,
    description: branding.description,
    siteName: branding.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${branding.name} — ${branding.tagline}`,
    description: branding.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
