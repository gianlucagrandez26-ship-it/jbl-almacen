'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { EstadoPedido, EstadoStock, Prioridad } from '@/lib/types';
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Marca                                                              */
/* ------------------------------------------------------------------ */

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-ficha bg-tinta">
        <span className="font-display text-[13px] font-extrabold leading-none text-white">
          JBL
        </span>
        <span className="absolute -bottom-[2px] left-1 right-1 h-[2px] bg-senal" />
      </div>
      {!compacta && (
        <div className="leading-none">
          <p className="font-display text-sm font-bold tracking-tight text-tinta">JBL SAC</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.13em] text-acero-500">
            Control de almacén
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Distintivos de estado                                              */
/* ------------------------------------------------------------------ */

const TEXTO_STOCK: Record<EstadoStock, string> = {
  disponible: 'Disponible',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

export function DistintivoStock({ estado }: { estado: EstadoStock }) {
  const clase =
    estado === 'disponible'
      ? 'distintivo-ok'
      : estado === 'bajo'
        ? 'distintivo-alerta'
        : 'distintivo-critico';

  return (
    <span className={clase}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {TEXTO_STOCK[estado]}
    </span>
  );
}

const COLOR_PEDIDO: Record<EstadoPedido, string> = {
  solicitado: 'bg-acero-100 text-acero-700',
  aprobado: 'bg-senal-claro text-senal-oscuro',
  en_preparacion: 'bg-senal-medio text-senal-oscuro',
  despachado: 'bg-tinta text-white',
  entregado: 'bg-ok-claro text-ok',
  anulado: 'bg-critico-claro text-critico',
};

export function DistintivoPedido({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`distintivo ${COLOR_PEDIDO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
  );
}

export function DistintivoPrioridad({ prioridad }: { prioridad: Prioridad }) {
  if (prioridad === 'normal' || prioridad === 'baja') {
    return <span className="distintivo-neutro">{ETIQUETA_PRIORIDAD[prioridad]}</span>;
  }
  return (
    <span className={prioridad === 'urgente' ? 'distintivo-critico' : 'distintivo-alerta'}>
      {ETIQUETA_PRIORIDAD[prioridad]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Medidor de existencias                                             */
/* ------------------------------------------------------------------ */

export function Medidor({
  cantidad,
  minimo,
  estado,
}: {
  cantidad: number;
  minimo: number;
  estado: EstadoStock;
}) {
  const techo = Math.max(minimo * 3, cantidad, 1);
  const proporcion = Math.min(100, Math.max(cantidad > 0 ? 4 : 0, (cantidad / techo) * 100));
  const color =
    estado === 'disponible' ? '#12775A' : estado === 'bajo' ? '#FFC400' : '#C4302B';

  return (
    <div className="medidor" role="presentation">
      <span style={{ width: `${proporcion}%`, backgroundColor: color }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Estado vacío                                                       */
/* ------------------------------------------------------------------ */

export function Vacio({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle: string;
  accion?: ReactNode;
}) {
  return (
    <div className="ficha reticula flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 h-9 w-9 rounded-ficha border-2 border-dashed border-acero-300" />
      <p className="titulo text-base">{titulo}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-acero-600">{detalle}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel modal                                                        */
/* ------------------------------------------------------------------ */

export function Modal({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  ancho = 'max-w-2xl',
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: string;
  ancho?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const cerrarConEsc = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', cerrarConEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', cerrarConEsc);
      document.body.style.overflow = '';
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 bg-tinta/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`animate-entra relative flex max-h-[92vh] w-full ${ancho} flex-col
                    rounded-t-lg bg-white shadow-panel sm:rounded-ficha`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-acero-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="titulo text-base">{titulo}</h2>
            {descripcion && (
              <p className="mt-1 text-sm leading-snug text-acero-600">{descripcion}</p>
            )}
          </div>
          <button onClick={alCerrar} className="btn-plano -mr-2 h-8 w-8 shrink-0 px-0" aria-label="Cerrar">
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Aviso en línea                                                     */
/* ------------------------------------------------------------------ */

export function Aviso({ tono, children }: { tono: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const clase =
    tono === 'error'
      ? 'bg-critico-claro text-critico'
      : tono === 'ok'
        ? 'bg-ok-claro text-ok'
        : 'bg-acero-100 text-acero-700';

  return (
    <p className={`rounded-ficha px-3 py-2.5 text-sm leading-snug ${clase}`} role="status">
      {children}
    </p>
  );
}
