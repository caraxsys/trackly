import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/components/theme/theme-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Trackly',
    template: '%s · Trackly',
  },
  description: 'Build consistency. Track progress.',
  applicationName: 'Trackly',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f6' },
    { media: '(prefers-color-scheme: dark)', color: '#111310' },
  ],
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html suppressHydrationWarning lang="en">
      <body>
        <ThemeProvider
          enableSystem
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
