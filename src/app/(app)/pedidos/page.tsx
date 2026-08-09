import { Suspense } from 'react';
import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/server';
import PedidosClient from './pedidos-client';
import type { Pedido } from '@/lib/types';

export const metadata: Metadata = { title: 'Pedidos' };
export const dynamic = 'force-dynamic';

export default async function PaginaPedidos() {
  const supabase = crearClienteServidor();

  const { data } = await supabase
    .from('pedidos')
    .select('*, pedido_items(*), pedido_eventos(*)')
    .order('creado_en', { ascending: false })
    .limit(200);

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-ficha bg-acero-100" />}>
      <PedidosClient pedidos={(data ?? []) as Pedido[]} />
    </Suspense>
  );
}
