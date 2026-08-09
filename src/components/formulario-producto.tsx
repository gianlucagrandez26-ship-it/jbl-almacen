'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { guardarProducto } from '@/app/(app)/inventario/actions';
import { evento } from '@/lib/analytics';
import { Aviso, Modal } from './ui';
import { UNIDADES, type Categoria, type Producto } from '@/lib/types';

const LIMITE_MB = 5;

export function FormularioProducto({
  abierto,
  alCerrar,
  categorias,
  producto,
}: {
  abierto: boolean;
  alCerrar: () => void;
  categorias: Categoria[];
  producto?: Producto | null;
}) {
  const editando = Boolean(producto);
  const supabase = crearClienteNavegador();
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '');
  const [sku, setSku] = useState(producto?.sku ?? '');
  const [categoriaId, setCategoriaId] = useState(
    producto?.categoria_id ?? categorias[0]?.id ?? 0
  );
  const [cantidad, setCantidad] = useState(String(producto?.cantidad ?? 0));
  const [unidad, setUnidad] = useState(producto?.unidad ?? 'UND');
  const [minimo, setMinimo] = useState(String(producto?.stock_minimo ?? 0));
  const [ubicacion, setUbicacion] = useState(producto?.ubicacion ?? '');
  const [observacion, setObservacion] = useState(producto?.observacion ?? '');
  const [imagen, setImagen] = useState(producto?.imagen_url ?? '');

  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subirImagen(archivo: File) {
    setError(null);

    if (archivo.size > LIMITE_MB * 1024 * 1024) {
      setError(`La imagen pesa más de ${LIMITE_MB} MB. Usa una versión más liviana.`);
      return;
    }

    setSubiendo(true);
    try {
      const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ruta = `${crypto.randomUUID()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from('productos')
        .upload(ruta, archivo, { cacheControl: '31536000', upsert: false });

      if (errorSubida) throw errorSubida;

      const { data } = supabase.storage.from('productos').getPublicUrl(ruta);
      setImagen(data.publicUrl);
      evento('subir_imagen_producto');
    } catch {
      setError('No se pudo subir la imagen. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setSubiendo(false);
      if (entradaArchivo.current) entradaArchivo.current.value = '';
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const resultado = await guardarProducto({
      id: producto?.id,
      sku,
      descripcion,
      categoria_id: Number(categoriaId),
      cantidad: Number(cantidad) || 0,
      unidad,
      stock_minimo: Number(minimo) || 0,
      ubicacion: ubicacion || null,
      observacion: observacion || null,
      imagen_url: imagen || null,
    });

    setGuardando(false);

    if (resultado.ok) {
      evento(editando ? 'editar_producto' : 'crear_producto', { categoria_id: categoriaId });
      alCerrar();
    } else {
      setError(resultado.mensaje ?? 'No se pudo guardar el producto.');
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={editando ? 'Editar producto' : 'Nuevo producto'}
      descripcion={
        editando
          ? 'La cantidad se cambia con un movimiento de kardex, no desde aquí.'
          : 'La cantidad inicial se registra como ingreso en el kardex.'
      }
    >
      <form onSubmit={enviar} className="space-y-5">
        {/* Imagen */}
        <div>
          <span className="etiqueta-campo">Fotografía</span>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-ficha border border-acero-200 bg-acero-50">
              {imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagen} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-acero-300">
                  <ImagePlus size={20} strokeWidth={1.6} />
                </div>
              )}
              {subiendo && (
                <div className="absolute inset-0 grid place-items-center bg-white/75">
                  <Loader2 size={18} className="animate-spin text-acero-600" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => entradaArchivo.current?.click()}
                  disabled={subiendo}
                  className="btn-borde h-9"
                >
                  {imagen ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                {imagen && (
                  <button type="button" onClick={() => setImagen('')} className="btn-plano h-9">
                    <Trash2 size={14} /> Quitar
                  </button>
                )}
              </div>
              <p className="text-xs leading-snug text-acero-500">
                JPG, PNG o WebP · hasta {LIMITE_MB} MB
              </p>
            </div>
          </div>

          <input
            ref={entradaArchivo}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) void subirImagen(archivo);
            }}
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="etiqueta-campo">Descripción</label>
          <input
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            className="campo"
            placeholder='Amoladora de 7"'
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="categoria" className="etiqueta-campo">Clasificación</label>
            <select
              id="categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(Number(e.target.value))}
              className="campo"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sku" className="etiqueta-campo">SKU</label>
            <input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="campo font-mono"
              placeholder="Se genera solo si lo dejas vacío"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="cantidad" className="etiqueta-campo">
              {editando ? 'Saldo actual' : 'Cantidad inicial'}
            </label>
            <input
              id="cantidad"
              type="number"
              min={0}
              step="any"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              disabled={editando}
              className="campo dato disabled:bg-acero-50 disabled:text-acero-500"
            />
          </div>

          <div>
            <label htmlFor="unidad" className="etiqueta-campo">Unidad</label>
            <select
              id="unidad"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className="campo"
            >
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="minimo" className="etiqueta-campo">Stock mínimo</label>
            <input
              id="minimo"
              type="number"
              min={0}
              step="any"
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
              className="campo dato"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ubicacion" className="etiqueta-campo">Ubicación en almacén</label>
          <input
            id="ubicacion"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            className="campo"
            placeholder="Rack B · Nivel 2"
          />
        </div>

        <div>
          <label htmlFor="observacion" className="etiqueta-campo">Observación</label>
          <textarea
            id="observacion"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            className="campo-area"
            placeholder="Notas de compra, medidas, especificación técnica…"
          />
        </div>

        {error && <Aviso tono="error">{error}</Aviso>}

        <div className="flex justify-end gap-2 border-t border-acero-100 pt-5">
          <button type="button" onClick={alCerrar} className="btn-borde">Cancelar</button>
          <button type="submit" disabled={guardando || subiendo} className="btn-principal">
            {guardando && <Loader2 size={15} className="animate-spin" />}
            {editando ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
