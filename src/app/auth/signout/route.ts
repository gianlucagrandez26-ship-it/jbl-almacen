import { NextResponse, type NextRequest } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase.from('actividad').insert({
      usuario_id: user.id,
      usuario_email: user.email,
      accion: 'salir',
      entidad: 'sesion',
    });
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
