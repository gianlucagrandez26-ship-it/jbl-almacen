import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { crearClienteServidor } from '@/lib/supabase/server';
import { DistintivoPedido, DistintivoStock } from '@/components/ui';
import type { Pedido, Producto, ResumenAlmacen } from '@/lib/types';

export const metadata: Metadata = { title: 'Panel' };
export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('es-PE');

function Cifra({
  valor,
  etiqueta,
  nota,
  tono = 'normal',
}: {
  valor: number;
  etiqueta: string;
  nota: string;
  tono?: 'normal' | 'alerta' | 'critico';
}) {
  const color =
    tono === 'critico' ? 'text-critico' : tono === 'alerta' ? 'text-alerta' : 'text-tinta';

  return (
    <div className="ficha ficha-perforacion p-5">
      <p className="eyebrow">{etiqueta}</p>
      <p className={`dato mt-3 text-[34px] font-medium leading-none ${color}`}>
        {nf.format(valor)}
      </p>
      <p className="mt-2.5 text-xs leading-snug text-acero-500">{nota}</p>
    </div>
  );
}

export default async function Panel() {
  const supabase = crearClienteServidor();

  const [{ data: resumenCrudo }, { data: criticos }, { data: pedidos }] = await Promise.all([
    supabase.rpc('fn_resumen_almacen'),
    supabase
      .from('v_productos')
      .select('*')
      .eq('activo', true)
      .in('estado_stock', ['agotado', 'bajo'])
      .order('cantidad', { ascending: true })
      .limit(6),
    supabase
      .from('pedidos')
      .select('*, pedido_items(id)')
      .not('estado', 'in', '("entregado","anulado")')
      .order('creado_en', { ascending: false })
      .limit(5),
  ]);

  const resumen = (resumenCrudo ?? {
    total_items: 0, unidades: 0, agotados: 0, stock_bajo: 0,
    pedidos_abiertos: 0, categorias: [],
  }) as ResumenAlmacen;

  const listaCriticos = (criticos ?? []) as Producto[];
  const listaPedidos = (pedidos ?? []) as Pedido[];
  const maxItems = Math.max(1, ...resumen.categorias.map((c) => c.items));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Almacén central · JBL SAC</p>
          <h1 className="titulo mt-2 text-[28px] leading-tight">Estado del almacén</h1>
        </div>
        <Link href="/pedidos" className="btn-principal">
          Registrar pedido
        </Link>
      </header>

      <section className="escalonado grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra
          valor={resumen.total_items}
          etiqueta="Ítems en catálogo"
          nota="Registros activos en las cinco clasificaciones"
        />
        <Cifra
          valor={resumen.unidades}
          etiqueta="Unidades en stock"
          nota="Suma de existencias de todos los ítems"
        />
        <Cifra
          valor={resumen.stock_bajo}
          etiqueta="Bajo el mínimo"
          nota="Ítems que necesitan reposición"
          tono={resumen.stock_bajo > 0 ? 'alerta' : 'normal'}
        />
        <Cifra
          valor={resumen.agotados}
          etiqueta="Agotados"
          nota="Ítems sin existencias disponibles"
          tono={resumen.agotados > 0 ? 'critico' : 'normal'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Elevación del rack por clasificación */}
        <section className="ficha p-6">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="titulo text-base">Reparto por clasificación</h2>
            <Link
              href="/inventario"
              className="group inline-flex items-center gap-1 font-mono text-micro uppercase tracking-[0.1em] text-acero-500 hover:text-tinta"
            >
              Ver inventario
              <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
            </Link>
          </div>

          <div className="space-y-px">
            {resumen.categorias.map((c) => (
              <Link
                key={c.codigo}
                href={`/inventario?categoria=${c.codigo}`}
                className="group flex items-center gap-4 border-b border-acero-100 py-3.5 last:border-0"
              >
                <span className="dato w-9 shrink-0 text-xs text-acero-500 group-hover:text-tinta">
                  {c.codigo}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-acero-700 group-hover:text-tinta">
                  {c.nombre}
                </span>
                <span className="hidden h-[3px] shrink-0 rounded-full bg-senal sm:block"
                      style={{ width: `${Math.max(6, (c.items / maxItems) * 110)}px` }} />
                <span className="dato w-8 shrink-0 text-right text-sm">{c.items}</span>
                <span className="dato hidden w-16 shrink-0 text-right text-xs text-acero-500 sm:block">
                  {nf.format(c.unidades)} u.
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Reposición pendiente */}
        <section className="ficha p-6">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="titulo text-base">Necesita reposición</h2>
            {listaCriticos.length > 0 && (
              <span className="distintivo-alerta">
                <TriangleAlert size={11} />
                {listaCriticos.length}
              </span>
            )}
          </div>

          {listaCriticos.length === 0 ? (
            <p className="py-8 text-center text-sm text-acero-500">
              Todos los ítems están sobre su stock mínimo.
            </p>
          ) : (
            <ul className="space-y-px">
              {listaCriticos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-acero-100 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.descripcion}</p>
                    <p className="dato mt-1 text-[11px] text-acero-500">{p.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="dato text-sm">
                      {nf.format(p.cantidad)}
                      <span className="ml-1 text-[11px] text-acero-400">{p.unidad}</span>
                    </p>
                    <p className="dato mt-0.5 text-[11px] text-acero-400">
                      mín. {nf.format(p.stock_minimo)}
                    </p>
                  </div>
                  <DistintivoStock estado={p.estado_stock} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Pedidos en curso */}
      <section className="ficha p-6">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="titulo text-base">Pedidos en curso</h2>
          <Link
            href="/pedidos"
            className="group inline-flex items-center gap-1 font-mono text-micro uppercase tracking-[0.1em] text-acero-500 hover:text-tinta"
          >
            Ver todos
            <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
          </Link>
        </div>

        {listaPedidos.length === 0 ? (
          <p className="py-8 text-center text-sm text-acero-500">
            No hay pedidos abiertos. Registra uno desde la sección Pedidos.
          </p>
        ) : (
          <ul className="space-y-px">
            {listaPedidos.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pedidos?abrir=${p.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-acero-100 py-3.5 last:border-0 hover:bg-acero-50"
                >
                  <span className="dato w-[112px] shrink-0 text-xs text-acero-600">{p.codigo}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.solicitante}</span>
                  <span className="dato shrink-0 text-xs text-acero-500">
                    {p.pedido_items?.length ?? 0} ítems
                  </span>
                  <DistintivoPedido estado={p.estado} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
