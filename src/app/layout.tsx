import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorProvider from '@/contexts/ErrorContext';
import { GlobalErrorToast } from '@/components/error/ErrorToast';
import { OfflineBanner } from '@/components/error/OfflineHandler';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hunter Pace Timer',
  description: 'Hunter Pace Event Timer and Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hunter Pace Timer',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <ErrorProvider enableErrorReporting={true}>
            <OfflineBanner />
            {children}
            <Toaster />
            <GlobalErrorToast />
          </ErrorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
