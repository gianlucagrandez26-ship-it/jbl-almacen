import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Cliente de Supabase para Server Components, Route Handlers y Server Actions. */
export function crearClienteServidor() {
  const almacenCookies = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options)
            );
          } catch {
            // Los Server Components no pueden escribir cookies.
            // El middleware ya refresca la sesión, así que se ignora sin riesgo.
          }
        },
      },
    }
  );
}
