'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Envía un evento personalizado a GA4. */
export function evento(nombre: string, parametros: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', nombre, parametros);
  }
}

/** Asocia la sesión de GA4 con el usuario de Supabase (sin datos personales). */
export function identificar(idUsuario: string, rol?: string) {
  if (typeof window !== 'undefined' && window.gtag && GA_ID) {
    window.gtag('config', GA_ID, { user_id: idUsuario });
    if (rol) window.gtag('set', 'user_properties', { rol_almacen: rol });
  }
}

function SeguimientoRuta() {
  const ruta = usePathname();
  const parametros = useSearchParams();

  useEffect(() => {
    if (!GA_ID || !window.gtag) return;
    const url = ruta + (parametros.toString() ? `?${parametros}` : '');
    window.gtag('event', 'page_view', { page_path: url, page_location: window.location.href });
  }, [ruta, parametros]);

  return null;
}

/** Carga GA4 y registra cada navegación del App Router. */
export function Analitica() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false, anonymize_ip: true });
        `}
      </Script>
      <Suspense fallback={null}>
        <SeguimientoRuta />
      </Suspense>
    </>
  );
}
