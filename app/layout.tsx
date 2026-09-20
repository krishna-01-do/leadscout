import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { branding } from '@/lib/branding';
import { AuthProvider } from '@/components/providers';

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
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-D5V2N8QQ0Q"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-D5V2N8QQ0Q');`}
        </Script>
      </head>
      <body className={inter.className} suppressHydrationWarning><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
