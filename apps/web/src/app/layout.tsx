import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VaultEdge — AI Infrastructure Governance',
    template: '%s | VaultEdge',
  },
  description:
    'The unified governance layer for LLM infrastructure. Route, monitor, secure, and optimize every AI API call.',
  keywords: ['AI', 'LLM', 'API Gateway', 'Infrastructure', 'Governance', 'OpenAI', 'Anthropic'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>{children}</body>
    </html>
  );
}
