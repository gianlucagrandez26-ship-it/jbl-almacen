'use client';

import * as XLSX from 'xlsx';
import type { Pedido, Producto } from './types';

/* ------------------------------------------------------------------ */
/*  Salida                                                             */
/* ------------------------------------------------------------------ */

function descargar(libro: XLSX.WorkBook, nombre: string) {
  XLSX.writeFile(libro, nombre, { compression: true });
}

function anchos(hoja: XLSX.WorkSheet, medidas: number[]) {
  hoja['!cols'] = medidas.map((w) => ({ wch: w }));
}

const hoy = () => new Date().toISOString().slice(0, 10);

/** Exporta el inventario visible (respeta búsqueda y filtros aplicados). */
export function exportarInventario(productos: Producto[]) {
  const filas = productos.map((p) => ({
    SKU: p.sku,
    'DESCRIPCIÓN': p.descripcion,
    'CATEGORÍA': p.categoria_nombre ?? '',
    CANTIDAD: p.cantidad,
    UNIDAD: p.unidad,
    'STOCK MÍNIMO': p.stock_minimo,
    ESTADO: p.estado_stock.toUpperCase(),
    'UBICACIÓN': p.ubicacion ?? '',
    'OBSERVACIÓN': p.observacion ?? '',
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  anchos(hoja, [16, 46, 34, 11, 9, 14, 14, 16, 60]);

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Inventario');
  descargar(libro, `JBL-SAC_Inventario_${hoy()}.xlsx`);
}

/** Exporta pedidos con su detalle: una hoja de cabeceras y otra de ítems. */
export function exportarPedidos(pedidos: Pedido[]) {
  const cabeceras = pedidos.map((p) => ({
    'CÓDIGO': p.codigo,
    SOLICITANTE: p.solicitante,
    'ÁREA': p.area ?? '',
    PROYECTO: p.proyecto ?? '',
    ESTADO: p.estado,
    PRIORIDAD: p.prioridad,
    'FECHA REQUERIDA': p.fecha_requerida ?? '',
    'ÍTEMS': p.pedido_items?.length ?? 0,
    'REGISTRADO': new Date(p.creado_en).toLocaleString('es-PE'),
    'OBSERVACIÓN': p.observacion ?? '',
  }));

  const detalle = pedidos.flatMap((p) =>
    (p.pedido_items ?? []).map((i) => ({
      'CÓDIGO PEDIDO': p.codigo,
      ESTADO: p.estado,
      'DESCRIPCIÓN': i.descripcion,
      CANTIDAD: i.cantidad,
      UNIDAD: i.unidad,
      ATENDIDO: i.atendido,
      PENDIENTE: Number(i.cantidad) - Number(i.atendido),
    }))
  );

  const h1 = XLSX.utils.json_to_sheet(cabeceras);
  anchos(h1, [16, 24, 18, 22, 16, 12, 16, 8, 20, 44]);

  const h2 = XLSX.utils.json_to_sheet(
    detalle.length ? detalle : [{ 'CÓDIGO PEDIDO': '', 'DESCRIPCIÓN': 'Sin ítems' }]
  );
  anchos(h2, [16, 16, 46, 11, 9, 11, 11]);

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, h1, 'Pedidos');
  XLSX.utils.book_append_sheet(libro, h2, 'Detalle');
  descargar(libro, `JBL-SAC_Pedidos_${hoy()}.xlsx`);
}

/** Genera la plantilla que el usuario llena para cargar un pedido. */
export function descargarPlantillaPedido() {
  const ejemplo = [
    {
      'DESCRIPCIÓN': 'Amoladora de 7"',
      SKU: 'JBL-HER-020',
      CANTIDAD: 2,
      UNIDAD: 'UND',
      'OBSERVACIÓN': 'Para el frente de montaje de vigas',
    },
    {
      'DESCRIPCIÓN': 'Disco de corte de 7"',
      SKU: '',
      CANTIDAD: 1,
      UNIDAD: 'CJA',
      'OBSERVACIÓN': 'El SKU es opcional: si va vacío se busca por descripción',
    },
  ];

  const hoja = XLSX.utils.json_to_sheet(ejemplo);
  anchos(hoja, [42, 16, 11, 9, 52]);

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Pedido');
  descargar(libro, 'JBL-SAC_Plantilla-Pedido.xlsx');
}

/* ------------------------------------------------------------------ */
/*  Entrada                                                            */
/* ------------------------------------------------------------------ */

export interface FilaPedidoImportada {
  descripcion: string;
  sku: string | null;
  cantidad: number;
  unidad: string;
  observacion: string | null;
}

/** Encuentra una columna sin importar acentos, mayúsculas ni espacios. */
function columna(fila: Record<string, unknown>, ...alias: string[]) {
  const normal = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  const mapa = new Map(Object.keys(fila).map((k) => [normal(k), k]));
  for (const a of alias) {
    const encontrada = mapa.get(normal(a));
    if (encontrada !== undefined) return fila[encontrada];
  }
  return undefined;
}

/**
 * Lee un Excel o CSV y devuelve las líneas de pedido.
 * Acepta cabeceras en español con o sin tildes.
 */
export async function leerPedidoDesdeExcel(archivo: File): Promise<FilaPedidoImportada[]> {
  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(buffer, { type: 'array' });
  const primera = libro.SheetNames[0];

  if (!primera) throw new Error('El archivo no contiene ninguna hoja.');

  const crudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    libro.Sheets[primera],
    { defval: '' }
  );

  const filas = crudas
    .map((f) => {
      const descripcion = String(
        columna(f, 'descripcion', 'descripción', 'item', 'producto', 'material') ?? ''
      ).trim();

      const cantidadCruda = columna(f, 'cantidad', 'cant', 'qty');
      const cantidad = Number(String(cantidadCruda ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));

      return {
        descripcion,
        sku: String(columna(f, 'sku', 'codigo', 'código') ?? '').trim() || null,
        cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0,
        unidad: String(columna(f, 'unidad', 'und', 'um') ?? 'UND').trim().toUpperCase() || 'UND',
        observacion: String(columna(f, 'observacion', 'observación', 'nota') ?? '').trim() || null,
      };
    })
    .filter((f) => f.descripcion.length > 0 && f.cantidad > 0);

  if (!filas.length) {
    throw new Error(
      'No se encontraron líneas válidas. El archivo necesita las columnas DESCRIPCIÓN y CANTIDAD.'
    );
  }

  return filas;
}
