import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import { Navegacion } from '@/components/navegacion';
import type { Perfil } from '@/lib/types';

export default async function LayoutAplicacion({ children }: { children: React.ReactNode }) {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen">
      <Navegacion perfil={(perfil as Perfil) ?? null} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
