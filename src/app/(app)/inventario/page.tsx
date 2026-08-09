import { Suspense } from 'react';
import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/server';
import InventarioClient from './inventario-client';
import type { Categoria, Producto } from '@/lib/types';

export const metadata: Metadata = { title: 'Inventario' };
export const dynamic = 'force-dynamic';

export default async function PaginaInventario() {
  const supabase = crearClienteServidor();

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from('v_productos')
      .select('*')
      .eq('activo', true)
      .order('categoria_codigo', { ascending: true })
      .order('descripcion', { ascending: true }),
    supabase.from('categorias').select('*').order('orden'),
  ]);

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-ficha bg-acero-100" />}>
      <InventarioClient
        productos={(productos ?? []) as Producto[]}
        categorias={(categorias ?? []) as Categoria[]}
      />
    </Suspense>
  );
}
