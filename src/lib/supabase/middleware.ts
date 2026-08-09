import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Rutas accesibles sin sesión iniciada. */
const PUBLICAS = ['/login', '/auth'];

/** Refresca la sesión en cada petición y protege las rutas privadas. */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const ruta = request.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => ruta.startsWith(p));

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('destino', ruta);
    return NextResponse.redirect(url);
  }

  if (user && ruta === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/panel';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
