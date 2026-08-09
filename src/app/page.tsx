import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';

export default async function Inicio() {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? '/panel' : '/login');
}
