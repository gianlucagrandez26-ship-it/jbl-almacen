export type EstadoStock = 'disponible' | 'bajo' | 'agotado';

export type EstadoPedido =
  | 'solicitado'
  | 'aprobado'
  | 'en_preparacion'
  | 'despachado'
  | 'entregado'
  | 'anulado';

export type Prioridad = 'baja' | 'normal' | 'alta' | 'urgente';

export type Rol = 'admin' | 'supervisor' | 'operario' | 'lectura';

export interface Categoria {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface Producto {
  id: string;
  sku: string;
  item_origen: number | null;
  descripcion: string;
  categoria_id: number | null;
  categoria_codigo: string | null;
  categoria_nombre: string | null;
  cantidad: number;
  unidad: string;
  stock_minimo: number;
  ubicacion: string | null;
  observacion: string | null;
  imagen_url: string | null;
  activo: boolean;
  estado_stock: EstadoStock;
  creado_en: string;
  actualizado_en: string;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  descripcion: string;
  cantidad: number;
  unidad: string;
  atendido: number;
}

export interface PedidoEvento {
  id: number;
  pedido_id: string;
  estado: EstadoPedido;
  nota: string | null;
  usuario_id: string | null;
  creado_en: string;
}

export interface Pedido {
  id: string;
  codigo: string;
  solicitante: string;
  area: string | null;
  proyecto: string | null;
  estado: EstadoPedido;
  prioridad: Prioridad;
  fecha_requerida: string | null;
  observacion: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  creado_en: string;
  actualizado_en: string;
  pedido_items?: PedidoItem[];
  pedido_eventos?: PedidoEvento[];
}

export interface Perfil {
  id: string;
  email: string | null;
  nombre: string | null;
  avatar_url: string | null;
  cargo: string | null;
  rol: Rol;
  activo: boolean;
  ultimo_acceso: string | null;
  creado_en: string;
}

export interface Movimiento {
  id: number;
  producto_id: string;
  tipo: 'ingreso' | 'salida' | 'ajuste';
  cantidad: number;
  saldo_resultante: number | null;
  motivo: string | null;
  creado_en: string;
  productos?: { sku: string; descripcion: string; unidad: string } | null;
}

export interface RegistroActividad {
  id: number;
  usuario_id: string | null;
  usuario_email: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  creado_en: string;
}

export interface ResumenAlmacen {
  total_items: number;
  unidades: number;
  agotados: number;
  stock_bajo: number;
  pedidos_abiertos: number;
  categorias: {
    codigo: string;
    nombre: string;
    orden: number;
    items: number;
    unidades: number;
  }[];
}

/** Secuencia real del flujo de un pedido — el orden importa para el tracking. */
export const FLUJO_PEDIDO: EstadoPedido[] = [
  'solicitado',
  'aprobado',
  'en_preparacion',
  'despachado',
  'entregado',
];

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  solicitado: 'Solicitado',
  aprobado: 'Aprobado',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
  anulado: 'Anulado',
};

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  baja: 'Baja',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const UNIDADES = [
  'UND', 'KG', 'CJA', 'CPO', 'BOT', 'JGO', 'ROL', 'GLN', 'PQT', 'MTR', 'LT',
];
