'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Download, FileSpreadsheet, Loader2, Plus, Search } from 'lucide-react';
import { FormularioPedido } from '@/components/formulario-pedido';
import { DistintivoPedido, DistintivoPrioridad, Modal, Vacio, Aviso } from '@/components/ui';
import { cambiarEstadoPedido, enlaceAdjunto } from './actions';
import { exportarPedidos } from '@/lib/excel';
import { evento } from '@/lib/analytics';
import {
  ETIQUETA_ESTADO, FLUJO_PEDIDO, type EstadoPedido, type Pedido,
} from '@/lib/types';

const FILTROS: (EstadoPedido | 'todos' | 'abiertos')[] = [
  'todos', 'abiertos', 'solicitado', 'aprobado', 'en_preparacion',
  'despachado', 'entregado', 'anulado',
];

const NOMBRE_FILTRO: Record<string, string> = {
  todos: 'Todos',
  abiertos: 'Abiertos',
  ...ETIQUETA_ESTADO,
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

const limpiar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function PedidosClient({ pedidos }: { pedidos: Pedido[] }) {
  const router = useRouter();
  const parametros = useSearchParams();

  const [consulta, setConsulta] = useState('');
  const [filtro, setFiltro] = useState<string>('abiertos');
  const [creando, setCreando] = useState(false);
  const [detalle, setDetalle] = useState<Pedido | null>(null);

  // Permite abrir un pedido directo desde el panel
  useEffect(() => {
    const id = parametros.get('abrir');
    if (id) {
      const encontrado = pedidos.find((p) => p.id === id);
      if (encontrado) {
        setFiltro('todos');
        setDetalle(encontrado);
      }
    }
  }, [parametros, pedidos]);

  const resultados = useMemo(() => {
    const q = limpiar(consulta.trim());

    return pedidos.filter((p) => {
      if (filtro === 'abiertos' && ['entregado', 'anulado'].includes(p.estado)) return false;
      if (filtro !== 'todos' && filtro !== 'abiertos' && p.estado !== filtro) return false;
      if (!q) return true;

      return (
        limpiar(p.codigo).includes(q) ||
        limpiar(p.solicitante).includes(q) ||
        limpiar(p.area ?? '').includes(q) ||
        limpiar(p.proyecto ?? '').includes(q) ||
        (p.pedido_items ?? []).some((i) => limpiar(i.descripcion).includes(q))
      );
    });
  }, [pedidos, consulta, filtro]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Seguimiento · {pedidos.length} registrados</p>
          <h1 className="titulo mt-2 text-[28px] leading-tight">Pedidos</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              exportarPedidos(resultados);
              evento('exportar_excel', { origen: 'pedidos', filas: resultados.length });
            }}
            className="btn-borde"
          >
            <Download size={15} />
            Exportar Excel
          </button>
          <button onClick={() => setCreando(true)} className="btn-principal">
            <Plus size={16} />
            Nuevo pedido
          </button>
        </div>
      </header>

      <section className="ficha p-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-acero-400"
          />
          <input
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            className="campo pl-9"
            placeholder="Buscar por código, solicitante, área, proyecto o material…"
            aria-label="Buscar pedidos"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-acero-100 pt-3">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`rounded-ficha px-2.5 py-1.5 font-mono text-micro uppercase tracking-[0.07em] transition-colors ${
                filtro === f
                  ? 'bg-tinta text-white'
                  : 'text-acero-600 hover:bg-acero-100 hover:text-tinta'
              }`}
            >
              {NOMBRE_FILTRO[f]}
            </button>
          ))}
        </div>
      </section>

      {resultados.length === 0 ? (
        <Vacio
          titulo="Sin pedidos que mostrar"
          detalle="Registra un pedido a mano o cárgalo desde un archivo Excel."
          accion={
            <button onClick={() => setCreando(true)} className="btn-principal">
              <Plus size={16} /> Nuevo pedido
            </button>
          }
        />
      ) : (
        <div className="escalonado space-y-2">
          {resultados.map((p) => (
            <button
              key={p.id}
              onClick={() => setDetalle(p)}
              className="ficha ficha-perforacion flex w-full flex-wrap items-center gap-x-5 gap-y-3 p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="dato text-xs text-acero-600">{p.codigo}</span>
                  <DistintivoPedido estado={p.estado} />
                  <DistintivoPrioridad prioridad={p.prioridad} />
                  {p.archivo_nombre && (
                    <FileSpreadsheet size={13} className="text-acero-400" aria-label="Con Excel adjunto" />
                  )}
                </div>
                <p className="mt-1.5 truncate text-[15px] font-medium">{p.solicitante}</p>
                <p className="mt-0.5 truncate text-xs text-acero-500">
                  {[p.area, p.proyecto].filter(Boolean).join(' · ') || 'Sin área asignada'}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="dato text-sm">{p.pedido_items?.length ?? 0} ítems</p>
                <p className="dato mt-1 text-[11px] text-acero-500">{fecha(p.creado_en)}</p>
              </div>

              <div className="w-full sm:w-40 sm:shrink-0">
                <BarraFlujo estado={p.estado} />
              </div>
            </button>
          ))}
        </div>
      )}

      {creando && (
        <FormularioPedido
          abierto={creando}
          alCerrar={() => { setCreando(false); router.refresh(); }}
        />
      )}

      <DetallePedido
        pedido={detalle}
        alCerrar={() => { setDetalle(null); router.replace('/pedidos'); router.refresh(); }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Barra de flujo — cinco pasos reales del pedido                     */
/* ------------------------------------------------------------------ */

function BarraFlujo({ estado }: { estado: EstadoPedido }) {
  if (estado === 'anulado') {
    return <div className="h-[3px] w-full rounded-full bg-critico/25" />;
  }

  const paso = FLUJO_PEDIDO.indexOf(estado);

  return (
    <div className="flex gap-1" role="presentation">
      {FLUJO_PEDIDO.map((_, i) => (
        <span
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-colors ${
            i <= paso ? (i === FLUJO_PEDIDO.length - 1 ? 'bg-ok' : 'bg-senal') : 'bg-acero-100'
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detalle con línea de tiempo                                        */
/* ------------------------------------------------------------------ */

function DetallePedido({
  pedido,
  alCerrar,
}: {
  pedido: Pedido | null;
  alCerrar: () => void;
}) {
  const [nota, setNota] = useState('');
  const [procesando, setProcesando] = useState<EstadoPedido | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!pedido) return null;

  const paso = FLUJO_PEDIDO.indexOf(pedido.estado);
  const siguiente = paso >= 0 && paso < FLUJO_PEDIDO.length - 1 ? FLUJO_PEDIDO[paso + 1] : null;
  const cerrado = ['entregado', 'anulado'].includes(pedido.estado);

  async function avanzar(estado: EstadoPedido) {
    setError(null);
    setProcesando(estado);

    const resultado = await cambiarEstadoPedido(pedido!.id, estado, nota);
    setProcesando(null);

    if (resultado.ok) {
      evento('cambiar_estado_pedido', { estado });
      setNota('');
      alCerrar();
    } else {
      setError(resultado.mensaje ?? 'No se pudo actualizar el pedido.');
    }
  }

  async function descargarAdjunto() {
    if (!pedido?.archivo_url) return;
    const url = await enlaceAdjunto(pedido.archivo_url);
    if (url) window.open(url, '_blank', 'noopener');
    else setError('El enlace de descarga expiró. Vuelve a intentarlo.');
  }

  return (
    <Modal
      abierto={pedido !== null}
      alCerrar={alCerrar}
      titulo={pedido.codigo}
      descripcion={`${pedido.solicitante}${pedido.area ? ` · ${pedido.area}` : ''}`}
      ancho="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <DistintivoPedido estado={pedido.estado} />
          <DistintivoPrioridad prioridad={pedido.prioridad} />
          {pedido.fecha_requerida && (
            <span className="distintivo-neutro">Para el {fecha(pedido.fecha_requerida)}</span>
          )}
        </div>

        {/* Seguimiento */}
        <section>
          <p className="eyebrow mb-4">Seguimiento</p>
          <ol className="space-y-0">
            {FLUJO_PEDIDO.map((etapa, i) => {
              const alcanzada = i <= paso && pedido.estado !== 'anulado';
              const evento_ = pedido.pedido_eventos?.find((e) => e.estado === etapa);

              return (
                <li key={etapa} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                        alcanzada
                          ? 'border-tinta bg-tinta text-white'
                          : 'border-acero-200 bg-white text-acero-300'
                      }`}
                    >
                      {alcanzada ? <Check size={12} strokeWidth={3} /> : <span className="dato text-[9px]">{i + 1}</span>}
                    </span>
                    {i < FLUJO_PEDIDO.length - 1 && (
                      <span className={`w-[2px] flex-1 ${i < paso ? 'bg-tinta' : 'bg-acero-200'}`} />
                    )}
                  </div>

                  <div className={`min-w-0 flex-1 pb-5 ${i === FLUJO_PEDIDO.length - 1 ? 'pb-0' : ''}`}>
                    <p className={`text-sm font-medium ${alcanzada ? 'text-tinta' : 'text-acero-400'}`}>
                      {ETIQUETA_ESTADO[etapa]}
                    </p>
                    {evento_ && (
                      <p className="dato mt-0.5 text-[11px] text-acero-500">
                        {fechaHora(evento_.creado_en)}
                        {evento_.nota && evento_.nota !== 'Cambio de estado' ? ` · ${evento_.nota}` : ''}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Detalle de líneas */}
        <section>
          <p className="eyebrow mb-3">Detalle · {pedido.pedido_items?.length ?? 0} líneas</p>
          <div className="overflow-hidden rounded-ficha border border-acero-200">
            <table className="w-full text-sm">
              <tbody>
                {(pedido.pedido_items ?? []).map((item, i) => (
                  <tr key={item.id} className={i > 0 ? 'border-t border-acero-100' : ''}>
                    <td className="dato w-8 px-3 py-2.5 text-[11px] text-acero-400">{i + 1}</td>
                    <td className="px-1 py-2.5">
                      <span className={item.producto_id ? '' : 'text-acero-600'}>
                        {item.descripcion}
                      </span>
                      {!item.producto_id && (
                        <span className="dato ml-2 text-[10px] uppercase text-alerta">
                          fuera de catálogo
                        </span>
                      )}
                    </td>
                    <td className="dato whitespace-nowrap px-3 py-2.5 text-right">
                      {item.cantidad}
                      <span className="ml-1 text-[11px] text-acero-400">{item.unidad}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {pedido.observacion && (
          <section>
            <p className="eyebrow mb-2">Observación</p>
            <p className="text-sm leading-relaxed text-acero-700">{pedido.observacion}</p>
          </section>
        )}

        {pedido.archivo_nombre && (
          <button onClick={descargarAdjunto} className="btn-borde w-full justify-start">
            <FileSpreadsheet size={15} />
            <span className="truncate">{pedido.archivo_nombre}</span>
            <Download size={14} className="ml-auto shrink-0" />
          </button>
        )}

        {error && <Aviso tono="error">{error}</Aviso>}

        {/* Acciones */}
        {!cerrado && (
          <section className="space-y-3 border-t border-acero-100 pt-5">
            <div>
              <label htmlFor="nota-estado" className="etiqueta-campo">Nota del cambio</label>
              <input
                id="nota-estado"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="campo"
                placeholder="Opcional: quién recibe, guía de remisión, turno…"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {siguiente && (
                <button
                  onClick={() => avanzar(siguiente)}
                  disabled={procesando !== null}
                  className="btn-principal flex-1"
                >
                  {procesando === siguiente && <Loader2 size={15} className="animate-spin" />}
                  Pasar a {ETIQUETA_ESTADO[siguiente].toLowerCase()}
                </button>
              )}
              <button
                onClick={() => avanzar('anulado')}
                disabled={procesando !== null}
                className="btn-peligro"
              >
                Anular
              </button>
            </div>

            {siguiente === 'despachado' && (
              <p className="text-xs leading-snug text-acero-600">
                Al despachar se descuenta del kardex cada línea enlazada al catálogo.
              </p>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
