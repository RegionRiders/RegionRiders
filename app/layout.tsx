import '@mantine/core/styles.css';

import React from 'react';
import { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { wDroge } from 'public/fonts/fonts';
import { theme } from '@/theme';

export const metadata: Metadata = {
  title: 'RegionRiders',
  description: 'Track and share your cycling adventures with RegionRiders.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" className={wDroge.variable} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  );
}
