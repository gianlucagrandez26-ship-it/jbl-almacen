'use server';

import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/server';

export interface Resultado {
  ok: boolean;
  mensaje?: string;
}

interface DatosProducto {
  id?: string;
  sku: string;
  descripcion: string;
  categoria_id: number;
  cantidad: number;
  unidad: string;
  stock_minimo: number;
  ubicacion: string | null;
  observacion: string | null;
  imagen_url: string | null;
}

/** Crea o actualiza un producto. El SKU se genera solo si viene vacío. */
export async function guardarProducto(datos: DatosProducto): Promise<Resultado> {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: 'Sesión expirada. Vuelve a entrar.' };

  if (!datos.descripcion.trim()) {
    return { ok: false, mensaje: 'La descripción es obligatoria.' };
  }

  let sku = datos.sku.trim().toUpperCase();

  if (!sku) {
    const { data: cat } = await supabase
      .from('categorias')
      .select('codigo')
      .eq('id', datos.categoria_id)
      .single();

    const codigo = cat?.codigo ?? 'GEN';
    const { count } = await supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .like('sku', `JBL-${codigo}-%`);

    sku = `JBL-${codigo}-${String((count ?? 0) + 1).padStart(3, '0')}`;
  }

  const fila = {
    sku,
    descripcion: datos.descripcion.trim(),
    categoria_id: datos.categoria_id,
    unidad: datos.unidad,
    stock_minimo: datos.stock_minimo,
    ubicacion: datos.ubicacion?.trim() || null,
    observacion: datos.observacion?.trim() || null,
    imagen_url: datos.imagen_url,
  };

  if (datos.id) {
    // La cantidad no se edita aquí: se ajusta con un movimiento de kardex
    const { error } = await supabase.from('productos').update(fila).eq('id', datos.id);
    if (error) {
      return {
        ok: false,
        mensaje: error.code === '23505' ? 'Ese SKU ya existe.' : error.message,
      };
    }
  } else {
    const { data: creado, error } = await supabase
      .from('productos')
      .insert({ ...fila, cantidad: 0, creado_por: user.id })
      .select('id')
      .single();

    if (error) {
      return {
        ok: false,
        mensaje: error.code === '23505' ? 'Ese SKU ya existe.' : error.message,
      };
    }

    if (datos.cantidad > 0 && creado) {
      await supabase.from('movimientos').insert({
        producto_id: creado.id,
        tipo: 'ingreso',
        cantidad: datos.cantidad,
        motivo: 'Alta de producto',
        usuario_id: user.id,
      });
    }
  }

  revalidatePath('/inventario');
  revalidatePath('/panel');
  return { ok: true };
}

/** Registra un movimiento de kardex; el trigger actualiza el saldo. */
export async function registrarMovimiento(datos: {
  producto_id: string;
  tipo: 'ingreso' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
}): Promise<Resultado> {
  const supabase = crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: 'Sesión expirada. Vuelve a entrar.' };

  if (datos.cantidad < 0) return { ok: false, mensaje: 'La cantidad no puede ser negativa.' };
  if (datos.tipo !== 'ajuste' && datos.cantidad === 0) {
    return { ok: false, mensaje: 'Indica una cantidad mayor que cero.' };
  }

  const { error } = await supabase.from('movimientos').insert({
    producto_id: datos.producto_id,
    tipo: datos.tipo,
    cantidad: datos.cantidad,
    motivo: datos.motivo.trim() || null,
    usuario_id: user.id,
  });

  if (error) {
    return {
      ok: false,
      mensaje: error.message.includes('Stock insuficiente')
        ? 'La salida supera el saldo disponible.'
        : error.message,
    };
  }

  revalidatePath('/inventario');
  revalidatePath('/movimientos');
  revalidatePath('/panel');
  return { ok: true };
}

/** Retira un producto del catálogo sin borrar su histórico de kardex. */
export async function darDeBajaProducto(id: string): Promise<Resultado> {
  const supabase = crearClienteServidor();
  const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id);
  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/inventario');
  revalidatePath('/panel');
  return { ok: true };
}
