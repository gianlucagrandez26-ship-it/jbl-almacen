import { Suspense } from 'react';
import type { Metadata } from 'next';
import FormularioAcceso from './login-form';

export const metadata: Metadata = { title: 'Acceso' };

/** Elevación del rack: cada nivel es un grupo real de la clasificación. */
const NIVELES = [
  { codigo: 'HER', nombre: 'Herramientas manuales y eléctricas', items: 27 },
  { codigo: 'CON', nombre: 'Consumibles', items: 28 },
  { codigo: 'EQP', nombre: 'Equipos', items: 13 },
  { codigo: 'EPP', nombre: 'Protección personal', items: 8 },
  { codigo: 'ACT', nombre: 'Activos de obra', items: 2 },
];

const MAX = Math.max(...NIVELES.map((n) => n.items));

export default function PaginaAcceso() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca — la elevación del rack como tesis visual */}
      <section className="reticula relative hidden flex-col justify-between overflow-hidden bg-tinta px-12 py-12 lg:flex xl:px-16">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-senal" />

        <header className="relative">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-ficha bg-white">
              <span className="font-display text-base font-extrabold leading-none text-tinta">JBL</span>
              <span className="absolute -bottom-[2px] left-1 right-1 h-[2px] bg-senal" />
            </div>
            <div className="leading-none">
              <p className="font-display text-base font-bold tracking-tight text-white">JBL SAC</p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-acero-400">
                Control logístico de almacenamiento
              </p>
            </div>
          </div>
        </header>

        <div className="relative">
          <h2 className="titulo max-w-lg text-[40px] leading-[1.06] text-white xl:text-[46px]">
            Todo lo que sale del almacén,
            <span className="text-senal"> con nombre y firma.</span>
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-acero-300">
            Materiales, EPP, herramienta manual y de poder en un solo registro. Cada
            movimiento queda en el kardex y cada pedido deja su rastro.
          </p>

          <div className="mt-11 max-w-md space-y-px">
            <p className="eyebrow mb-3 text-acero-500">Grupos de clasificación</p>
            {NIVELES.map((nivel) => (
              <div
                key={nivel.codigo}
                className="group flex items-center gap-4 border-b border-white/10 py-3"
              >
                <span className="dato w-9 shrink-0 text-xs text-senal">{nivel.codigo}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-acero-300">
                  {nivel.nombre}
                </span>
                <span
                  className="h-[2px] shrink-0 bg-white/25"
                  style={{ width: `${(nivel.items / MAX) * 88}px` }}
                />
                <span className="dato w-7 shrink-0 text-right text-xs text-white">
                  {nivel.items}
                </span>
              </div>
            ))}
          </div>
        </div>

        <footer className="relative flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.13em] text-acero-500">
          <span>78 ítems en catálogo</span>
          <span className="h-3 w-px bg-acero-700" />
          <span>Kardex trazable</span>
        </footer>
      </section>

      {/* Formulario */}
      <section className="flex flex-col items-center justify-center bg-white px-6 py-14 sm:px-12">
        <div className="mb-10 flex w-full max-w-sm items-center gap-2.5 lg:hidden">
          <div className="relative grid h-9 w-9 place-items-center rounded-ficha bg-tinta">
            <span className="font-display text-sm font-extrabold leading-none text-white">JBL</span>
            <span className="absolute -bottom-[2px] left-1 right-1 h-[2px] bg-senal" />
          </div>
          <div className="leading-none">
            <p className="font-display text-sm font-bold tracking-tight">JBL SAC</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.13em] text-acero-500">
              Control de almacén
            </p>
          </div>
        </div>

        <Suspense
          fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-ficha bg-acero-100" />}
        >
          <FormularioAcceso />
        </Suspense>
      </section>
    </main>
  );
}
