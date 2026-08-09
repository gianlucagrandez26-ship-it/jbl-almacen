-- =====================================================================
-- JBL SAC · Control Logístico de Almacén
-- Esquema Supabase (PostgreSQL) — tablas, RLS, triggers y storage
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ---------------------------------------------------------------------
-- 1. PERFILES  (extiende auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  nombre      text,
  avatar_url  text,
  cargo       text,
  rol         text not null default 'operario'
              check (rol in ('admin', 'supervisor', 'operario', 'lectura')),
  activo      boolean not null default true,
  ultimo_acceso timestamptz,
  creado_en   timestamptz not null default now()
);

-- Alta automática de perfil al registrarse (email o Google)
create or replace function public.fn_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, email, nombre, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_nuevo_usuario on auth.users;
create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function public.fn_nuevo_usuario();

-- ---------------------------------------------------------------------
-- 2. CATEGORÍAS
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id          serial primary key,
  codigo      text not null unique,
  nombre      text not null unique,
  descripcion text,
  orden       int not null default 0
);

-- ---------------------------------------------------------------------
-- 3. PRODUCTOS
-- ---------------------------------------------------------------------
create table if not exists public.productos (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null unique,
  item_origen    int,
  descripcion    text not null,
  categoria_id   int references public.categorias(id) on delete set null,
  cantidad       numeric(12,2) not null default 0,
  unidad         text not null default 'UND',
  stock_minimo   numeric(12,2) not null default 0,
  ubicacion      text,
  observacion    text,
  imagen_url     text,
  activo         boolean not null default true,
  creado_por     uuid references auth.users(id) on delete set null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Búsqueda de texto completo en español (descripción + SKU + observación)
alter table public.productos
  drop column if exists busqueda;
alter table public.productos
  add column busqueda tsvector
  generated always as (
    to_tsvector('spanish',
      coalesce(descripcion, '') || ' ' ||
      coalesce(sku, '')         || ' ' ||
      coalesce(ubicacion, '')   || ' ' ||
      coalesce(observacion, '')
    )
  ) stored;

create index if not exists idx_productos_busqueda  on public.productos using gin(busqueda);
create index if not exists idx_productos_categoria on public.productos(categoria_id);
create index if not exists idx_productos_sku       on public.productos(sku);

-- Vista con estado de stock calculado.
-- security_invoker: la vista se evalúa con los permisos de quien consulta,
-- de modo que las políticas RLS de productos siguen aplicando a través de ella.
drop view if exists public.v_productos;
create view public.v_productos with (security_invoker = on) as
select
  p.*,
  c.codigo as categoria_codigo,
  c.nombre as categoria_nombre,
  case
    when p.cantidad <= 0                 then 'agotado'
    when p.cantidad <= p.stock_minimo    then 'bajo'
    else                                      'disponible'
  end as estado_stock
from public.productos p
left join public.categorias c on c.id = p.categoria_id;

-- ---------------------------------------------------------------------
-- 4. PEDIDOS  (+ ítems + eventos de tracking)
-- ---------------------------------------------------------------------
create table if not exists public.pedidos (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  solicitante     text not null,
  area            text,
  proyecto        text,
  estado          text not null default 'solicitado'
                  check (estado in ('solicitado','aprobado','en_preparacion',
                                    'despachado','entregado','anulado')),
  prioridad       text not null default 'normal'
                  check (prioridad in ('baja','normal','alta','urgente')),
  fecha_requerida date,
  observacion     text,
  archivo_url     text,   -- Excel adjunto en Storage
  archivo_nombre  text,
  creado_por      uuid references auth.users(id) on delete set null,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table if not exists public.pedido_items (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  descripcion text not null,
  cantidad    numeric(12,2) not null default 0,
  unidad      text not null default 'UND',
  atendido    numeric(12,2) not null default 0
);

create table if not exists public.pedido_eventos (
  id          bigserial primary key,
  pedido_id   uuid not null references public.pedidos(id) on delete cascade,
  estado      text not null,
  nota        text,
  usuario_id  uuid references auth.users(id) on delete set null,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_pedido_items_pedido   on public.pedido_items(pedido_id);
create index if not exists idx_pedido_eventos_pedido on public.pedido_eventos(pedido_id);
create index if not exists idx_pedidos_estado        on public.pedidos(estado);

-- Correlativo automático: PED-2026-0001
create sequence if not exists public.seq_pedido;

create or replace function public.fn_codigo_pedido()
returns trigger language plpgsql as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'PED-' || to_char(now(), 'YYYY') || '-' ||
                  lpad(nextval('public.seq_pedido')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_codigo_pedido on public.pedidos;
create trigger trg_codigo_pedido
  before insert on public.pedidos
  for each row execute function public.fn_codigo_pedido();

-- Registra un evento cada vez que cambia el estado del pedido
create or replace function public.fn_evento_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pedido_eventos (pedido_id, estado, nota, usuario_id)
    values (new.id, new.estado, 'Pedido registrado', auth.uid());
  elsif new.estado is distinct from old.estado then
    insert into public.pedido_eventos (pedido_id, estado, nota, usuario_id)
    values (new.id, new.estado, 'Cambio de estado', auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_evento_pedido on public.pedidos;
create trigger trg_evento_pedido
  after insert or update on public.pedidos
  for each row execute function public.fn_evento_pedido();

-- ---------------------------------------------------------------------
-- 5. MOVIMIENTOS (kardex) — actualizan el stock del producto
-- ---------------------------------------------------------------------
create table if not exists public.movimientos (
  id               bigserial primary key,
  producto_id      uuid not null references public.productos(id) on delete cascade,
  tipo             text not null check (tipo in ('ingreso','salida','ajuste')),
  cantidad         numeric(12,2) not null,
  saldo_resultante numeric(12,2),
  motivo           text,
  pedido_id        uuid references public.pedidos(id) on delete set null,
  usuario_id       uuid references auth.users(id) on delete set null,
  creado_en        timestamptz not null default now()
);

create index if not exists idx_movimientos_producto on public.movimientos(producto_id, creado_en desc);

create or replace function public.fn_aplicar_movimiento()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nuevo numeric(12,2);
begin
  select case
           when new.tipo = 'ingreso' then cantidad + new.cantidad
           when new.tipo = 'salida'  then cantidad - new.cantidad
           else new.cantidad
         end
    into nuevo
  from public.productos where id = new.producto_id;

  if nuevo < 0 then
    raise exception 'Stock insuficiente: la salida deja el saldo en %', nuevo;
  end if;

  update public.productos
     set cantidad = nuevo, actualizado_en = now()
   where id = new.producto_id;

  new.saldo_resultante := nuevo;
  return new;
end;
$$;

drop trigger if exists trg_aplicar_movimiento on public.movimientos;
create trigger trg_aplicar_movimiento
  before insert on public.movimientos
  for each row execute function public.fn_aplicar_movimiento();

-- ---------------------------------------------------------------------
-- 6. ACTIVIDAD — logging de usuarios (bitácora de auditoría)
-- ---------------------------------------------------------------------
create table if not exists public.actividad (
  id            bigserial primary key,
  usuario_id    uuid references auth.users(id) on delete set null,
  usuario_email text,
  accion        text not null,          -- crear | editar | eliminar | ingresar | salir | exportar | importar
  entidad       text not null,          -- productos | pedidos | movimientos | sesion
  entidad_id    text,
  detalle       jsonb,
  creado_en     timestamptz not null default now()
);

create index if not exists idx_actividad_fecha   on public.actividad(creado_en desc);
create index if not exists idx_actividad_usuario on public.actividad(usuario_id);

create or replace function public.fn_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_accion text;
  v_id text;
begin
  select email into v_email from public.perfiles where id = auth.uid();

  v_accion := case tg_op when 'INSERT' then 'crear'
                         when 'UPDATE' then 'editar'
                         else 'eliminar' end;

  v_id := case when tg_op = 'DELETE' then old.id::text else new.id::text end;

  insert into public.actividad (usuario_id, usuario_email, accion, entidad, entidad_id, detalle)
  values (
    auth.uid(), v_email, v_accion, tg_table_name, v_id,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_log_productos on public.productos;
create trigger trg_log_productos
  after insert or update or delete on public.productos
  for each row execute function public.fn_log();

drop trigger if exists trg_log_pedidos on public.pedidos;
create trigger trg_log_pedidos
  after insert or update or delete on public.pedidos
  for each row execute function public.fn_log();

-- Marca de tiempo de actualización
create or replace function public.fn_touch()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_productos on public.productos;
create trigger trg_touch_productos before update on public.productos
  for each row execute function public.fn_touch();

drop trigger if exists trg_touch_pedidos on public.pedidos;
create trigger trg_touch_pedidos before update on public.pedidos
  for each row execute function public.fn_touch();

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.perfiles       enable row level security;
alter table public.categorias     enable row level security;
alter table public.productos      enable row level security;
alter table public.pedidos        enable row level security;
alter table public.pedido_items   enable row level security;
alter table public.pedido_eventos enable row level security;
alter table public.movimientos    enable row level security;
alter table public.actividad      enable row level security;

-- Helper: rol del usuario en sesión
create or replace function public.fn_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.fn_escribe()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.fn_rol() in ('admin','supervisor','operario'), false);
$$;

-- PERFILES
drop policy if exists "perfiles_lectura" on public.perfiles;
create policy "perfiles_lectura" on public.perfiles
  for select to authenticated using (true);

drop policy if exists "perfiles_propio" on public.perfiles;
create policy "perfiles_propio" on public.perfiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "perfiles_admin" on public.perfiles;
create policy "perfiles_admin" on public.perfiles
  for all to authenticated using (public.fn_rol() = 'admin') with check (public.fn_rol() = 'admin');

-- CATEGORÍAS
drop policy if exists "categorias_lectura" on public.categorias;
create policy "categorias_lectura" on public.categorias
  for select to authenticated using (true);

drop policy if exists "categorias_admin" on public.categorias;
create policy "categorias_admin" on public.categorias
  for all to authenticated using (public.fn_rol() in ('admin','supervisor'))
  with check (public.fn_rol() in ('admin','supervisor'));

-- PRODUCTOS
drop policy if exists "productos_lectura" on public.productos;
create policy "productos_lectura" on public.productos
  for select to authenticated using (true);

drop policy if exists "productos_escritura" on public.productos;
create policy "productos_escritura" on public.productos
  for insert to authenticated with check (public.fn_escribe());

drop policy if exists "productos_edicion" on public.productos;
create policy "productos_edicion" on public.productos
  for update to authenticated using (public.fn_escribe()) with check (public.fn_escribe());

drop policy if exists "productos_borrado" on public.productos;
create policy "productos_borrado" on public.productos
  for delete to authenticated using (public.fn_rol() in ('admin','supervisor'));

-- PEDIDOS y dependientes
drop policy if exists "pedidos_lectura" on public.pedidos;
create policy "pedidos_lectura" on public.pedidos for select to authenticated using (true);

drop policy if exists "pedidos_escritura" on public.pedidos;
create policy "pedidos_escritura" on public.pedidos for insert to authenticated with check (public.fn_escribe());

drop policy if exists "pedidos_edicion" on public.pedidos;
create policy "pedidos_edicion" on public.pedidos for update to authenticated
  using (public.fn_escribe()) with check (public.fn_escribe());

drop policy if exists "pedidos_borrado" on public.pedidos;
create policy "pedidos_borrado" on public.pedidos for delete to authenticated
  using (public.fn_rol() in ('admin','supervisor'));

drop policy if exists "items_todo" on public.pedido_items;
create policy "items_todo" on public.pedido_items for all to authenticated
  using (true) with check (public.fn_escribe());

drop policy if exists "eventos_lectura" on public.pedido_eventos;
create policy "eventos_lectura" on public.pedido_eventos for select to authenticated using (true);

drop policy if exists "eventos_escritura" on public.pedido_eventos;
create policy "eventos_escritura" on public.pedido_eventos for insert to authenticated
  with check (public.fn_escribe());

-- MOVIMIENTOS
drop policy if exists "movimientos_lectura" on public.movimientos;
create policy "movimientos_lectura" on public.movimientos for select to authenticated using (true);

drop policy if exists "movimientos_escritura" on public.movimientos;
create policy "movimientos_escritura" on public.movimientos for insert to authenticated
  with check (public.fn_escribe());

-- ACTIVIDAD — solo lectura para admin/supervisor, escritura vía triggers
drop policy if exists "actividad_lectura" on public.actividad;
create policy "actividad_lectura" on public.actividad for select to authenticated
  using (public.fn_rol() in ('admin','supervisor') or usuario_id = auth.uid());

drop policy if exists "actividad_escritura" on public.actividad;
create policy "actividad_escritura" on public.actividad for insert to authenticated with check (true);

-- ---------------------------------------------------------------------
-- 8. STORAGE — imágenes de productos y adjuntos Excel de pedidos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pedidos', 'pedidos', false, 10485760,
        array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel','text/csv'])
on conflict (id) do nothing;

drop policy if exists "productos_img_ver" on storage.objects;
create policy "productos_img_ver" on storage.objects
  for select using (bucket_id = 'productos');

drop policy if exists "productos_img_subir" on storage.objects;
create policy "productos_img_subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos');

drop policy if exists "productos_img_borrar" on storage.objects;
create policy "productos_img_borrar" on storage.objects
  for delete to authenticated using (bucket_id = 'productos');

drop policy if exists "pedidos_xls_ver" on storage.objects;
create policy "pedidos_xls_ver" on storage.objects
  for select to authenticated using (bucket_id = 'pedidos');

drop policy if exists "pedidos_xls_subir" on storage.objects;
create policy "pedidos_xls_subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'pedidos');

-- ---------------------------------------------------------------------
-- 9. RESUMEN PARA EL PANEL
-- ---------------------------------------------------------------------
create or replace function public.fn_resumen_almacen()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total_items',   (select count(*) from productos where activo),
    'unidades',      (select coalesce(sum(cantidad),0) from productos where activo),
    'agotados',      (select count(*) from productos where activo and cantidad <= 0),
    'stock_bajo',    (select count(*) from productos where activo and cantidad > 0 and cantidad <= stock_minimo),
    'pedidos_abiertos', (select count(*) from pedidos where estado not in ('entregado','anulado')),
    'categorias', (
      select coalesce(json_agg(x order by x.orden), '[]'::json) from (
        select c.codigo, c.nombre, c.orden,
               count(p.id) as items,
               coalesce(sum(p.cantidad),0) as unidades
        from categorias c
        left join productos p on p.categoria_id = c.id and p.activo
        group by c.id, c.codigo, c.nombre, c.orden
      ) x
    )
  );
$$;
