import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Business R&D Dashboard v303',
  description: 'Manual runner UI for the AI-agent business R&D workflow.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b1020', color: '#e5e7eb' }}>
        {children}
      </body>
    </html>
  );
}
