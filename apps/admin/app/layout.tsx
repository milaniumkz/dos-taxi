import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DOS Admin',
  description: 'Backoffice for DOS transportation platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="app-body">{children}</body>
    </html>
  );
}
