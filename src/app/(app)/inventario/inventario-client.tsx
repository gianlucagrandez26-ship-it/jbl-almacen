'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeftRight, Download, LayoutGrid, Pencil, Plus, Rows3, Search, X,
} from 'lucide-react';
import { FormularioProducto } from '@/components/formulario-producto';
import { FormularioMovimiento } from '@/components/formulario-movimiento';
import { DistintivoStock, Medidor, Vacio } from '@/components/ui';
import { exportarInventario } from '@/lib/excel';
import { evento } from '@/lib/analytics';
import type { Categoria, EstadoStock, Producto } from '@/lib/types';

type Vista = 'fichas' | 'tabla';

const FILTROS_STOCK: { valor: EstadoStock | 'todos'; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todo el stock' },
  { valor: 'disponible', etiqueta: 'Disponible' },
  { valor: 'bajo', etiqueta: 'Stock bajo' },
  { valor: 'agotado', etiqueta: 'Agotado' },
];

/** Normaliza para que "amoladora" encuentre "Amoladora" y "guantes" encuentre "Guantés". */
const limpiar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function InventarioClient({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  const [consulta, setConsulta] = useState('');
  const [categoria, setCategoria] = useState<string>(parametros.get('categoria') ?? 'todas');
  const [stock, setStock] = useState<EstadoStock | 'todos'>('todos');
  const [vista, setVista] = useState<Vista>('fichas');

  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Producto | null>(null);
  const [enMovimiento, setEnMovimiento] = useState<Producto | null>(null);

  useEffect(() => {
    const desdeUrl = parametros.get('categoria');
    if (desdeUrl) setCategoria(desdeUrl);
  }, [parametros]);

  const resultados = useMemo(() => {
    const q = limpiar(consulta.trim());

    return productos.filter((p) => {
      if (categoria !== 'todas' && p.categoria_codigo !== categoria) return false;
      if (stock !== 'todos' && p.estado_stock !== stock) return false;
      if (!q) return true;

      return (
        limpiar(p.descripcion).includes(q) ||
        limpiar(p.sku).includes(q) ||
        limpiar(p.observacion ?? '').includes(q) ||
        limpiar(p.ubicacion ?? '').includes(q)
      );
    });
  }, [productos, consulta, categoria, stock]);

  const hayFiltros = consulta !== '' || categoria !== 'todas' || stock !== 'todos';

  function limpiarFiltros() {
    setConsulta('');
    setCategoria('todas');
    setStock('todos');
    router.replace('/inventario');
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setEnEdicion(null);
    router.refresh();
  }

  function abrirEdicion(p: Producto) {
    setEnEdicion(p);
    setFormularioAbierto(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catálogo · {productos.length} ítems</p>
          <h1 className="titulo mt-2 text-[28px] leading-tight">Inventario</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              exportarInventario(resultados);
              evento('exportar_excel', { origen: 'inventario', filas: resultados.length });
            }}
            className="btn-borde"
          >
            <Download size={15} />
            Exportar Excel
          </button>
          <button
            onClick={() => { setEnEdicion(null); setFormularioAbierto(true); }}
            className="btn-principal"
          >
            <Plus size={16} />
            Nuevo producto
          </button>
        </div>
      </header>

      {/* Buscador y filtros */}
      <section className="ficha p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-acero-400"
            />
            <input
              type="search"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              className="campo pl-9"
              placeholder="Buscar por descripción, SKU, ubicación u observación…"
              aria-label="Buscar productos"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="campo w-auto min-w-[190px]"
              aria-label="Filtrar por clasificación"
            >
              <option value="todas">Todas las clasificaciones</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.codigo}>{c.nombre}</option>
              ))}
            </select>

            <select
              value={stock}
              onChange={(e) => setStock(e.target.value as EstadoStock | 'todos')}
              className="campo w-auto min-w-[140px]"
              aria-label="Filtrar por estado de stock"
            >
              {FILTROS_STOCK.map((f) => (
                <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
              ))}
            </select>

            <div className="flex rounded-ficha border border-acero-200 p-0.5">
              {([['fichas', LayoutGrid], ['tabla', Rows3]] as const).map(([modo, Icono]) => (
                <button
                  key={modo}
                  onClick={() => setVista(modo)}
                  aria-pressed={vista === modo}
                  aria-label={modo === 'fichas' ? 'Ver como fichas' : 'Ver como tabla'}
                  className={`grid h-8 w-9 place-items-center rounded-[2px] transition-colors ${
                    vista === modo ? 'bg-tinta text-white' : 'text-acero-500 hover:text-tinta'
                  }`}
                >
                  <Icono size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-acero-100 pt-3">
          <p className="dato text-xs text-acero-500">
            {resultados.length} de {productos.length} ítems
          </p>
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1 font-mono text-micro uppercase tracking-[0.08em] text-acero-500 hover:text-tinta"
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {/* Resultados */}
      {resultados.length === 0 ? (
        <Vacio
          titulo="Ningún ítem coincide"
          detalle="Prueba con otras palabras o quita los filtros para ver el catálogo completo."
          accion={
            hayFiltros && (
              <button onClick={limpiarFiltros} className="btn-borde">Limpiar filtros</button>
            )
          }
        />
      ) : vista === 'fichas' ? (
        <div className="escalonado grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {resultados.map((p) => (
            <FichaProducto
              key={p.id}
              producto={p}
              alEditar={() => abrirEdicion(p)}
              alMover={() => setEnMovimiento(p)}
            />
          ))}
        </div>
      ) : (
        <TablaProductos
          productos={resultados}
          alEditar={abrirEdicion}
          alMover={setEnMovimiento}
        />
      )}

      {formularioAbierto && (
        <FormularioProducto
          abierto={formularioAbierto}
          alCerrar={cerrarFormulario}
          categorias={categorias}
          producto={enEdicion}
        />
      )}

      <FormularioMovimiento
        abierto={enMovimiento !== null}
        alCerrar={() => { setEnMovimiento(null); router.refresh(); }}
        producto={enMovimiento}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ficha de almacén — la etiqueta física del rack                     */
/* ------------------------------------------------------------------ */

function FichaProducto({
  producto: p,
  alEditar,
  alMover,
}: {
  producto: Producto;
  alEditar: () => void;
  alMover: () => void;
}) {
  return (
    <article className="ficha ficha-perforacion group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden bg-acero-50">
        {p.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagen_url}
            alt={p.descripcion}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="reticula grid h-full place-items-center">
            <span className="dato text-xs text-acero-300">sin imagen</span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span className="dato rounded-[2px] bg-white/92 px-1.5 py-1 text-[10px] tracking-[0.06em] text-acero-700 backdrop-blur-sm">
            {p.sku}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow truncate">{p.categoria_nombre}</p>
        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-medium leading-snug">
          {p.descripcion}
        </h3>

        {p.ubicacion && (
          <p className="dato mt-1.5 text-[11px] text-acero-500">{p.ubicacion}</p>
        )}

        <div className="mt-auto pt-4">
          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="dato text-[22px] font-medium leading-none">
              {p.cantidad}
              <span className="ml-1.5 text-xs font-normal text-acero-500">{p.unidad}</span>
            </p>
            <DistintivoStock estado={p.estado_stock} />
          </div>

          <Medidor cantidad={p.cantidad} minimo={p.stock_minimo} estado={p.estado_stock} />

          <p className="dato mt-2 text-[11px] text-acero-400">
            mínimo {p.stock_minimo} {p.unidad}
          </p>

          <div className="mt-3 flex gap-2 border-t border-acero-100 pt-3">
            <button onClick={alMover} className="btn-borde h-9 flex-1 text-xs">
              <ArrowLeftRight size={13} /> Movimiento
            </button>
            <button onClick={alEditar} className="btn-plano h-9 w-9 px-0" aria-label={`Editar ${p.descripcion}`}>
              <Pencil size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Vista de tabla — lectura densa                                     */
/* ------------------------------------------------------------------ */

function TablaProductos({
  productos,
  alEditar,
  alMover,
}: {
  productos: Producto[];
  alEditar: (p: Producto) => void;
  alMover: (p: Producto) => void;
}) {
  return (
    <div className="ficha overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-acero-200 text-left">
            {['SKU', 'Descripción', 'Clasificación', 'Cantidad', 'Mínimo', 'Estado', ''].map((h, i) => (
              <th
                key={h || i}
                className={`px-4 py-3 font-mono text-micro font-normal uppercase tracking-[0.09em] text-acero-500 ${
                  i >= 3 && i <= 4 ? 'text-right' : ''
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id} className="border-b border-acero-100 last:border-0 hover:bg-acero-50">
              <td className="dato whitespace-nowrap px-4 py-3 text-xs text-acero-600">{p.sku}</td>
              <td className="max-w-md px-4 py-3">
                <p className="truncate font-medium">{p.descripcion}</p>
                {p.ubicacion && (
                  <p className="dato mt-0.5 text-[11px] text-acero-500">{p.ubicacion}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-acero-600">{p.categoria_nombre}</td>
              <td className="dato whitespace-nowrap px-4 py-3 text-right">
                {p.cantidad}
                <span className="ml-1 text-[11px] text-acero-400">{p.unidad}</span>
              </td>
              <td className="dato whitespace-nowrap px-4 py-3 text-right text-acero-500">
                {p.stock_minimo}
              </td>
              <td className="px-4 py-3"><DistintivoStock estado={p.estado_stock} /></td>
              <td className="whitespace-nowrap px-2 py-3 text-right">
                <button
                  onClick={() => alMover(p)}
                  className="btn-plano h-8 w-8 px-0"
                  aria-label={`Registrar movimiento de ${p.descripcion}`}
                >
                  <ArrowLeftRight size={14} />
                </button>
                <button
                  onClick={() => alEditar(p)}
                  className="btn-plano h-8 w-8 px-0"
                  aria-label={`Editar ${p.descripcion}`}
                >
                  <Pencil size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
