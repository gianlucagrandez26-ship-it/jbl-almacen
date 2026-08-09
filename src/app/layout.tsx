import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Analitica } from '@/lib/analytics';
import './globals.css';

const display = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--fuente-display',
  display: 'swap',
});

const cuerpo = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fuente-cuerpo',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--fuente-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Control de almacén · JBL SAC',
    template: '%s · JBL SAC',
  },
  description:
    'Control logístico de almacenamiento de materiales, equipos de protección personal, herramientas manuales y de poder.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#14171A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" className={`${display.variable} ${cuerpo.variable} ${mono.variable}`}>
      <body>
        {children}
        <Analitica />
      </body>
    </html>
  );
}
