'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { registrarMovimiento } from '@/app/(app)/inventario/actions';
import { evento } from '@/lib/analytics';
import { Aviso, Modal } from './ui';
import type { Producto } from '@/lib/types';

type Tipo = 'ingreso' | 'salida' | 'ajuste';

const OPCIONES: { valor: Tipo; etiqueta: string; ayuda: string }[] = [
  { valor: 'ingreso', etiqueta: 'Ingreso', ayuda: 'Suma al saldo actual' },
  { valor: 'salida', etiqueta: 'Salida', ayuda: 'Resta del saldo actual' },
  { valor: 'ajuste', etiqueta: 'Ajuste', ayuda: 'Fija el saldo tras inventario físico' },
];

export function FormularioMovimiento({
  abierto,
  alCerrar,
  producto,
}: {
  abierto: boolean;
  alCerrar: () => void;
  producto: Producto | null;
}) {
  const [tipo, setTipo] = useState<Tipo>('salida');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!producto) return null;

  const valor = Number(cantidad) || 0;
  const saldoFinal =
    tipo === 'ingreso' ? producto.cantidad + valor
    : tipo === 'salida' ? producto.cantidad - valor
    : valor;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!producto) return;

    setError(null);
    setGuardando(true);

    const resultado = await registrarMovimiento({
      producto_id: producto.id,
      tipo,
      cantidad: valor,
      motivo,
    });

    setGuardando(false);

    if (resultado.ok) {
      evento('registrar_movimiento', { tipo });
      setCantidad('');
      setMotivo('');
      alCerrar();
    } else {
      setError(resultado.mensaje ?? 'No se pudo registrar el movimiento.');
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Registrar movimiento"
      descripcion={`${producto.sku} · ${producto.descripcion}`}
      ancho="max-w-lg"
    >
      <form onSubmit={enviar} className="space-y-5">
        <div className="flex items-center justify-between rounded-ficha bg-acero-50 px-4 py-3">
          <span className="eyebrow">Saldo actual</span>
          <span className="dato text-lg">
            {producto.cantidad}
            <span className="ml-1.5 text-xs text-acero-500">{producto.unidad}</span>
          </span>
        </div>

        <div>
          <span className="etiqueta-campo">Tipo de movimiento</span>
          <div className="grid grid-cols-3 gap-2">
            {OPCIONES.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => setTipo(o.valor)}
                aria-pressed={tipo === o.valor}
                className={`rounded-ficha border px-3 py-2.5 text-left transition-colors ${
                  tipo === o.valor
                    ? 'border-tinta bg-tinta text-white'
                    : 'border-acero-200 bg-white hover:border-acero-400'
                }`}
              >
                <span className="block text-sm font-medium">{o.etiqueta}</span>
                <span className={`mt-0.5 block text-[11px] leading-tight ${
                  tipo === o.valor ? 'text-acero-300' : 'text-acero-500'
                }`}>
                  {o.ayuda}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="cant-mov" className="etiqueta-campo">
            {tipo === 'ajuste' ? 'Saldo contado' : 'Cantidad'}
          </label>
          <input
            id="cant-mov"
            type="number"
            min={0}
            step="any"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
            autoFocus
            className="campo dato"
            placeholder="0"
          />
          {cantidad !== '' && (
            <p className="mt-2 text-xs text-acero-600">
              Saldo tras el movimiento:{' '}
              <span className={`dato font-medium ${saldoFinal < 0 ? 'text-critico' : 'text-tinta'}`}>
                {saldoFinal} {producto.unidad}
              </span>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="motivo" className="etiqueta-campo">Motivo</label>
          <input
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="campo"
            placeholder="Entrega a frente de montaje · Compra OC-2451 · Inventario físico"
          />
        </div>

        {error && <Aviso tono="error">{error}</Aviso>}

        <div className="flex justify-end gap-2 border-t border-acero-100 pt-5">
          <button type="button" onClick={alCerrar} className="btn-borde">Cancelar</button>
          <button
            type="submit"
            disabled={guardando || saldoFinal < 0}
            className="btn-principal"
          >
            {guardando && <Loader2 size={15} className="animate-spin" />}
            Registrar movimiento
          </button>
        </div>
      </form>
    </Modal>
  );
}
