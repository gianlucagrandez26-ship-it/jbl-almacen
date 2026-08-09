'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { crearPedido, type LineaPedido } from '@/app/(app)/pedidos/actions';
import { descargarPlantillaPedido, leerPedidoDesdeExcel } from '@/lib/excel';
import { evento } from '@/lib/analytics';
import { Aviso, Modal } from './ui';
import { UNIDADES, type Prioridad } from '@/lib/types';

const PRIORIDADES: Prioridad[] = ['baja', 'normal', 'alta', 'urgente'];
const LINEA_VACIA: LineaPedido = { descripcion: '', sku: null, cantidad: 1, unidad: 'UND' };

export function FormularioPedido({
  abierto,
  alCerrar,
}: {
  abierto: boolean;
  alCerrar: () => void;
}) {
  const supabase = crearClienteNavegador();
  const entradaExcel = useRef<HTMLInputElement>(null);

  const [solicitante, setSolicitante] = useState('');
  const [area, setArea] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('normal');
  const [fecha, setFecha] = useState('');
  const [observacion, setObservacion] = useState('');
  const [lineas, setLineas] = useState<LineaPedido[]>([{ ...LINEA_VACIA }]);

  const [adjuntoRuta, setAdjuntoRuta] = useState<string | null>(null);
  const [adjuntoNombre, setAdjuntoNombre] = useState<string | null>(null);

  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function actualizarLinea(indice: number, cambios: Partial<LineaPedido>) {
    setLineas((prev) => prev.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  }

  async function cargarExcel(archivo: File) {
    setError(null);
    setAviso(null);
    setLeyendo(true);

    try {
      const filas = await leerPedidoDesdeExcel(archivo);
      setLineas(filas.map(({ descripcion, sku, cantidad, unidad }) => ({
        descripcion, sku, cantidad, unidad,
      })));

      // Se guarda el archivo original como respaldo del pedido
      const ruta = `${new Date().getFullYear()}/${crypto.randomUUID()}-${archivo.name}`;
      const { error: errorSubida } = await supabase.storage
        .from('pedidos')
        .upload(ruta, archivo, { upsert: false });

      if (!errorSubida) {
        setAdjuntoRuta(ruta);
        setAdjuntoNombre(archivo.name);
      }

      setAviso(
        `Se cargaron ${filas.length} líneas desde el archivo. Revísalas antes de registrar el pedido.`
      );
      evento('importar_excel', { origen: 'pedidos', filas: filas.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      setLeyendo(false);
      if (entradaExcel.current) entradaExcel.current.value = '';
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const validas = lineas.filter((l) => l.descripcion.trim() && l.cantidad > 0);

    if (validas.length === 0) {
      setError('Agrega al menos una línea con descripción y cantidad.');
      setGuardando(false);
      return;
    }

    const resultado = await crearPedido({
      solicitante, area, proyecto, prioridad,
      fecha_requerida: fecha || null,
      observacion: observacion || null,
      archivo_url: adjuntoRuta,
      archivo_nombre: adjuntoNombre,
      lineas: validas,
    });

    setGuardando(false);

    if (resultado.ok) {
      evento('crear_pedido', { lineas: validas.length, con_excel: Boolean(adjuntoRuta) });
      alCerrar();
    } else {
      setError(resultado.mensaje ?? 'No se pudo registrar el pedido.');
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo pedido"
      descripcion="Escribe las líneas a mano o cárgalas desde un Excel."
      ancho="max-w-3xl"
    >
      <form onSubmit={enviar} className="space-y-6">
        {/* Carga desde Excel */}
        <section className="reticula rounded-ficha border border-dashed border-acero-300 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-acero-500" />
              <div>
                <p className="text-sm font-medium">Cargar desde Excel</p>
                <p className="mt-0.5 text-xs leading-snug text-acero-600">
                  El archivo necesita las columnas DESCRIPCIÓN y CANTIDAD. Se adjunta al pedido.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={descargarPlantillaPedido} className="btn-plano h-9 text-xs">
                Plantilla
              </button>
              <button
                type="button"
                onClick={() => entradaExcel.current?.click()}
                disabled={leyendo}
                className="btn-borde h-9"
              >
                {leyendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Elegir archivo
              </button>
            </div>
          </div>

          {adjuntoNombre && (
            <p className="dato mt-3 truncate text-[11px] text-acero-600">
              Adjunto: {adjuntoNombre}
            </p>
          )}

          <input
            ref={entradaExcel}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) void cargarExcel(archivo);
            }}
          />
        </section>

        {aviso && <Aviso tono="ok">{aviso}</Aviso>}

        {/* Cabecera */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="solicitante" className="etiqueta-campo">Solicitante</label>
            <input
              id="solicitante"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              required
              className="campo"
              placeholder="Nombre y apellido"
            />
          </div>
          <div>
            <label htmlFor="area" className="etiqueta-campo">Área</label>
            <input
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="campo"
              placeholder="Montaje · Mantenimiento · HSE"
            />
          </div>
          <div>
            <label htmlFor="proyecto" className="etiqueta-campo">Proyecto</label>
            <input
              id="proyecto"
              value={proyecto}
              onChange={(e) => setProyecto(e.target.value)}
              className="campo"
              placeholder="Obra o frente de trabajo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prioridad" className="etiqueta-campo">Prioridad</label>
              <select
                id="prioridad"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as Prioridad)}
                className="campo"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fecha" className="etiqueta-campo">Fecha requerida</label>
              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="campo"
              />
            </div>
          </div>
        </div>

        {/* Detalle */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="etiqueta-campo mb-0">Detalle · {lineas.length} líneas</span>
            <button
              type="button"
              onClick={() => setLineas((p) => [...p, { ...LINEA_VACIA }])}
              className="btn-plano h-8 text-xs"
            >
              <Plus size={13} /> Agregar línea
            </button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-ficha border border-acero-200 p-2">
            {lineas.map((linea, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="dato w-6 shrink-0 text-center text-[11px] text-acero-400">
                  {i + 1}
                </span>
                <input
                  value={linea.descripcion}
                  onChange={(e) => actualizarLinea(i, { descripcion: e.target.value })}
                  className="campo h-9 flex-1"
                  placeholder="Descripción del material"
                  aria-label={`Descripción de la línea ${i + 1}`}
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={linea.cantidad}
                  onChange={(e) => actualizarLinea(i, { cantidad: Number(e.target.value) })}
                  className="campo dato h-9 w-20 shrink-0"
                  aria-label={`Cantidad de la línea ${i + 1}`}
                />
                <select
                  value={linea.unidad}
                  onChange={(e) => actualizarLinea(i, { unidad: e.target.value })}
                  className="campo h-9 w-[86px] shrink-0"
                  aria-label={`Unidad de la línea ${i + 1}`}
                >
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setLineas((p) => p.filter((_, j) => j !== i))}
                  disabled={lineas.length === 1}
                  className="btn-plano h-9 w-9 shrink-0 px-0"
                  aria-label={`Quitar la línea ${i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="obs-pedido" className="etiqueta-campo">Observación</label>
          <textarea
            id="obs-pedido"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            className="campo-area"
            placeholder="Instrucciones de entrega, turno, punto de acopio…"
          />
        </div>

        {error && <Aviso tono="error">{error}</Aviso>}

        <div className="flex justify-end gap-2 border-t border-acero-100 pt-5">
          <button type="button" onClick={alCerrar} className="btn-borde">Cancelar</button>
          <button type="submit" disabled={guardando || leyendo} className="btn-principal">
            {guardando && <Loader2 size={15} className="animate-spin" />}
            Registrar pedido
          </button>
        </div>
      </form>
    </Modal>
  );
}
