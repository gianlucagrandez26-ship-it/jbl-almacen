import { NextResponse, type NextRequest } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/server';

/** Cierra el flujo OAuth de Google y el enlace mágico de correo. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const destino = searchParams.get('destino') ?? '/panel';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=sin_codigo`);
  }

  const supabase = crearClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=intercambio`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('perfiles').update({ ultimo_acceso: new Date().toISOString() }).eq('id', user.id);
    await supabase.from('actividad').insert({
      usuario_id: user.id,
      usuario_email: user.email,
      accion: 'ingresar',
      entidad: 'sesion',
      detalle: { proveedor: user.app_metadata?.provider ?? 'email' },
    });
  }

  // Detrás de un balanceador (Vercel) se respeta el host reenviado
  const reenviado = request.headers.get('x-forwarded-host');
  const base = process.env.NODE_ENV === 'development' || !reenviado
    ? origin
    : `https://${reenviado}`;

  return NextResponse.redirect(`${base}${destino}`);
}
