'use server';

import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/server';
import type { EstadoPedido, Prioridad } from '@/lib/types';

export interface Resultado {
  ok: boolean;
  mensaje?: string;
  id?: string;
}

export interface LineaPedido {
  descripcion: string;
  sku: string | null;
  cantidad: number;
  unidad: string;
}

/**
 * Crea un pedido con su detalle.
 * Las líneas pueden venir escritas a mano o leídas de un Excel;
 * cada una se enlaza al producto del catálogo cuando hay coincidencia.
 */
export async function crearPedido(datos: {
  solicitante: string;
  area: string | null;
  proyecto: string | null;
  prioridad: Prioridad;
  fecha_requerida: string | null;
  observacion: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  lineas: LineaPedido[];
}): Promise<Resultado> {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: 'Sesión expirada. Vuelve a entrar.' };

  if (!datos.solicitante.trim()) {
    return { ok: false, mensaje: 'Indica quién solicita el pedido.' };
  }
  if (datos.lineas.length === 0) {
    return { ok: false, mensaje: 'El pedido necesita al menos una línea.' };
  }

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({
      solicitante: datos.solicitante.trim(),
      area: datos.area?.trim() || null,
      proyecto: datos.proyecto?.trim() || null,
      prioridad: datos.prioridad,
      fecha_requerida: datos.fecha_requerida || null,
      observacion: datos.observacion?.trim() || null,
      archivo_url: datos.archivo_url,
      archivo_nombre: datos.archivo_nombre,
      creado_por: user.id,
    })
    .select('id, codigo')
    .single();

  if (error || !pedido) {
    return { ok: false, mensaje: error?.message ?? 'No se pudo crear el pedido.' };
  }

  // Enlaza cada línea con el catálogo: primero por SKU, luego por descripción
  const { data: catalogo } = await supabase
    .from('productos')
    .select('id, sku, descripcion')
    .eq('activo', true);

  const porSku = new Map((catalogo ?? []).map((p) => [p.sku.toUpperCase(), p.id]));
  const porDescripcion = new Map(
    (catalogo ?? []).map((p) => [p.descripcion.trim().toLowerCase(), p.id])
  );

  const items = datos.lineas.map((l) => ({
    pedido_id: pedido.id,
    producto_id:
      (l.sku ? porSku.get(l.sku.toUpperCase()) : undefined) ??
      porDescripcion.get(l.descripcion.trim().toLowerCase()) ??
      null,
    descripcion: l.descripcion.trim(),
    cantidad: l.cantidad,
    unidad: l.unidad || 'UND',
  }));

  const { error: errorItems } = await supabase.from('pedido_items').insert(items);

  if (errorItems) {
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    return { ok: false, mensaje: 'No se pudo guardar el detalle del pedido.' };
  }

  revalidatePath('/pedidos');
  revalidatePath('/panel');
  return { ok: true, id: pedido.id };
}

/**
 * Avanza el pedido a un nuevo estado.
 * Al despachar, descuenta del kardex las líneas enlazadas al catálogo.
 */
export async function cambiarEstadoPedido(
  id: string,
  estado: EstadoPedido,
  nota?: string
): Promise<Resultado> {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: 'Sesión expirada. Vuelve a entrar.' };

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('codigo, estado, pedido_items(id, producto_id, cantidad, atendido)')
    .eq('id', id)
    .single();

  if (!pedido) return { ok: false, mensaje: 'No se encontró el pedido.' };

  if (estado === 'despachado' && pedido.estado !== 'despachado') {
    const pendientes = (pedido.pedido_items ?? []).filter(
      (i) => i.producto_id && Number(i.cantidad) > Number(i.atendido)
    );

    for (const item of pendientes) {
      const saldoPorAtender = Number(item.cantidad) - Number(item.atendido);

      const { error } = await supabase.from('movimientos').insert({
        producto_id: item.producto_id,
        tipo: 'salida',
        cantidad: saldoPorAtender,
        motivo: `Despacho de pedido ${pedido.codigo}`,
        pedido_id: id,
        usuario_id: user.id,
      });

      if (error) {
        return {
          ok: false,
          mensaje: error.message.includes('Stock insuficiente')
            ? 'No hay stock suficiente para despachar todas las líneas del pedido.'
            : error.message,
        };
      }

      await supabase.from('pedido_items').update({ atendido: item.cantidad }).eq('id', item.id);
    }
  }

  const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id);
  if (error) return { ok: false, mensaje: error.message };

  if (nota?.trim()) {
    await supabase.from('pedido_eventos').insert({
      pedido_id: id,
      estado,
      nota: nota.trim(),
      usuario_id: user.id,
    });
  }

  revalidatePath('/pedidos');
  revalidatePath('/inventario');
  revalidatePath('/movimientos');
  revalidatePath('/panel');
  return { ok: true };
}

/** Devuelve un enlace temporal para descargar el Excel adjunto (bucket privado). */
export async function enlaceAdjunto(ruta: string): Promise<string | null> {
  const supabase = crearClienteServidor();
  const { data } = await supabase.storage.from('pedidos').createSignedUrl(ruta, 60 * 10);
  return data?.signedUrl ?? null;
}
