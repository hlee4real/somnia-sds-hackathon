/**
 * Root Layout for Bitcoin Price Tracker
 */
import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/components/Web3Provider';

export const metadata: Metadata = {
  title: 'Bitcoin Price Tracker - Somnia Data Streams',
  description: 'Real-time Bitcoin price tracking using Somnia Data Streams',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
