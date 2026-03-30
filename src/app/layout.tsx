import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bazaar Negotiation',
  description: 'Negotiate the best price for your vintage items with Rajesh Bhaiya in this AI powered experience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
