import type { Metadata } from 'next';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { crearClienteServidor } from '@/lib/supabase/server';
import { Vacio } from '@/components/ui';
import type { Movimiento } from '@/lib/types';

export const metadata: Metadata = { title: 'Movimientos' };
export const dynamic = 'force-dynamic';

const ICONO = {
  ingreso: { Icono: ArrowDownLeft, clase: 'bg-ok-claro text-ok', texto: 'Ingreso' },
  salida: { Icono: ArrowUpRight, clase: 'bg-critico-claro text-critico', texto: 'Salida' },
  ajuste: { Icono: Scale, clase: 'bg-senal-claro text-senal-oscuro', texto: 'Ajuste' },
} as const;

export default async function PaginaMovimientos() {
  const supabase = crearClienteServidor();

  const { data } = await supabase
    .from('movimientos')
    .select('*, productos(sku, descripcion, unidad)')
    .order('creado_en', { ascending: false })
    .limit(200);

  const movimientos = (data ?? []) as Movimiento[];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Kardex · últimos {movimientos.length} registros</p>
        <h1 className="titulo mt-2 text-[28px] leading-tight">Movimientos</h1>
      </header>

      {movimientos.length === 0 ? (
        <Vacio
          titulo="El kardex está vacío"
          detalle="Cada ingreso, salida y ajuste de existencias aparecerá aquí."
        />
      ) : (
        <div className="ficha overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-acero-200 text-left">
                {['Tipo', 'Producto', 'Cantidad', 'Saldo', 'Motivo', 'Fecha'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 font-mono text-micro font-normal uppercase tracking-[0.09em] text-acero-500 ${
                      i === 2 || i === 3 ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => {
                const { Icono, clase, texto } = ICONO[m.tipo];
                return (
                  <tr key={m.id} className="border-b border-acero-100 last:border-0 hover:bg-acero-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`distintivo ${clase}`}>
                        <Icono size={11} strokeWidth={2.4} />
                        {texto}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-medium">{m.productos?.descripcion ?? '—'}</p>
                      <p className="dato mt-0.5 text-[11px] text-acero-500">{m.productos?.sku}</p>
                    </td>
                    <td className="dato whitespace-nowrap px-4 py-3 text-right">
                      {m.tipo === 'salida' ? '−' : m.tipo === 'ingreso' ? '+' : '='}
                      {m.cantidad}
                      <span className="ml-1 text-[11px] text-acero-400">{m.productos?.unidad}</span>
                    </td>
                    <td className="dato whitespace-nowrap px-4 py-3 text-right text-acero-600">
                      {m.saldo_resultante ?? '—'}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-acero-600">
                      <span className="line-clamp-1">{m.motivo ?? '—'}</span>
                    </td>
                    <td className="dato whitespace-nowrap px-4 py-3 text-[11px] text-acero-500">
                      {new Date(m.creado_en).toLocaleString('es-PE', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
