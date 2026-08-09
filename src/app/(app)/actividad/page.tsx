import type { Metadata } from 'next';
import { crearClienteServidor } from '@/lib/supabase/server';
import { Vacio } from '@/components/ui';
import type { Perfil, RegistroActividad } from '@/lib/types';

export const metadata: Metadata = { title: 'Actividad' };
export const dynamic = 'force-dynamic';

const ACCION: Record<string, { texto: string; clase: string }> = {
  crear: { texto: 'Creó', clase: 'bg-ok-claro text-ok' },
  editar: { texto: 'Editó', clase: 'bg-senal-claro text-senal-oscuro' },
  eliminar: { texto: 'Eliminó', clase: 'bg-critico-claro text-critico' },
  ingresar: { texto: 'Entró', clase: 'bg-acero-100 text-acero-700' },
  salir: { texto: 'Salió', clase: 'bg-acero-100 text-acero-700' },
};

const ENTIDAD: Record<string, string> = {
  productos: 'un producto',
  pedidos: 'un pedido',
  movimientos: 'un movimiento',
  sesion: 'al sistema',
};

/** Extrae la etiqueta legible del registro guardado en JSON. */
function referencia(r: RegistroActividad): string | null {
  const d = r.detalle as Record<string, string> | null;
  if (!d) return null;
  return d.codigo ?? d.sku ?? d.descripcion ?? null;
}

export default async function PaginaActividad() {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: registros }] = await Promise.all([
    supabase.from('perfiles').select('rol').eq('id', user!.id).single(),
    supabase
      .from('actividad')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(150),
  ]);

  const rol = (perfil as Pick<Perfil, 'rol'> | null)?.rol ?? 'operario';
  const esResponsable = rol === 'admin' || rol === 'supervisor';
  const lista = (registros ?? []) as RegistroActividad[];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Bitácora · {esResponsable ? 'todo el equipo' : 'tu actividad'}</p>
        <h1 className="titulo mt-2 text-[28px] leading-tight">Actividad</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-acero-600">
          {esResponsable
            ? 'Cada alta, edición y baja del almacén queda registrada con su autor y su hora.'
            : 'Aquí ves tu propio historial. Los supervisores ven el del equipo completo.'}
        </p>
      </header>

      {lista.length === 0 ? (
        <Vacio
          titulo="Todavía no hay registros"
          detalle="La bitácora se llena sola conforme el equipo trabaja en el almacén."
        />
      ) : (
        <ol className="ficha divide-y divide-acero-100">
          {lista.map((r) => {
            const accion = ACCION[r.accion] ?? { texto: r.accion, clase: 'bg-acero-100 text-acero-700' };
            const ref = referencia(r);

            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                <span className={`distintivo ${accion.clase} shrink-0`}>{accion.texto}</span>

                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{r.usuario_email ?? 'Sistema'}</span>
                  <span className="text-acero-600"> · {ENTIDAD[r.entidad] ?? r.entidad}</span>
                  {ref && <span className="dato ml-2 text-xs text-acero-500">{ref}</span>}
                </p>

                <time
                  dateTime={r.creado_en}
                  className="dato shrink-0 text-[11px] text-acero-500"
                >
                  {new Date(r.creado_en).toLocaleString('es-PE', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
