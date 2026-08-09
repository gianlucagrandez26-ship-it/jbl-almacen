'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ClipboardList, ArrowLeftRight, History,
  Menu, X, LogOut,
} from 'lucide-react';
import { Marca } from './ui';
import { identificar } from '@/lib/analytics';
import type { Perfil } from '@/lib/types';

const RUTAS = [
  { href: '/panel', etiqueta: 'Panel', icono: LayoutDashboard },
  { href: '/inventario', etiqueta: 'Inventario', icono: Package },
  { href: '/pedidos', etiqueta: 'Pedidos', icono: ClipboardList },
  { href: '/movimientos', etiqueta: 'Movimientos', icono: ArrowLeftRight },
  { href: '/actividad', etiqueta: 'Actividad', icono: History },
];

const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operario: 'Operario',
  lectura: 'Solo lectura',
};

export function Navegacion({ perfil }: { perfil: Perfil | null }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => setAbierto(false), [ruta]);

  useEffect(() => {
    if (perfil) identificar(perfil.id, perfil.rol);
  }, [perfil]);

  const inicial = (perfil?.nombre ?? perfil?.email ?? '?').charAt(0).toUpperCase();

  const enlaces = (
    <nav className="flex-1 space-y-0.5 px-3">
      {RUTAS.map(({ href, etiqueta, icono: Icono }) => {
        const activo = ruta === href || ruta.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? 'page' : undefined}
            className={`relative flex h-10 items-center gap-3 rounded-ficha px-3 text-sm transition-colors ${
              activo
                ? 'bg-acero-100 font-medium text-tinta'
                : 'text-acero-600 hover:bg-acero-50 hover:text-tinta'
            }`}
          >
            {activo && (
              <span className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r-full bg-senal" />
            )}
            <Icono size={17} strokeWidth={1.9} className="shrink-0" />
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="border-t border-acero-100 p-3">
      <div className="flex items-center gap-2.5 rounded-ficha px-2 py-2">
        {perfil?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={perfil.avatar_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-acero-100 font-display text-xs font-bold text-acero-600">
            {inicial}
          </div>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium">{perfil?.nombre ?? 'Usuario'}</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-acero-500">
            {ETIQUETA_ROL[perfil?.rol ?? 'operario']}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-plano h-8 w-8 px-0" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Barra superior en móvil */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-acero-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Marca />
        <button
          onClick={() => setAbierto(true)}
          className="btn-plano h-9 w-9 px-0"
          aria-label="Abrir menú"
        >
          <Menu size={19} />
        </button>
      </header>

      {/* Cajón móvil */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-tinta/35 backdrop-blur-[2px]"
          />
          <aside className="animate-entra absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-panel">
            <div className="flex h-14 items-center justify-between border-b border-acero-100 px-4">
              <Marca />
              <button onClick={() => setAbierto(false)} className="btn-plano h-8 w-8 px-0" aria-label="Cerrar menú">
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">{enlaces}</div>
            {pie}
          </aside>
        </div>
      )}

      {/* Barra lateral en escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-acero-200 bg-white lg:flex">
        <div className="flex h-14 items-center px-4">
          <Marca />
        </div>
        <div className="flex-1 overflow-y-auto py-3">{enlaces}</div>
        {pie}
      </aside>
    </>
  );
}
