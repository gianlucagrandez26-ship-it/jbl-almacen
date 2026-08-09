# Control Logístico de Almacén · JBL SAC

Plataforma de control de almacenamiento de materiales, equipos de protección
personal, herramientas manuales y de poder.

**Next.js 14** (App Router) · **Supabase** (Postgres + Auth + Storage) ·
**Tailwind CSS** · **Google Analytics 4** · despliegue en **Vercel**.

> Reparto de responsabilidades: Vercel aloja la aplicación; Supabase es la base
> de datos, la autenticación y el almacén de archivos. Vercel no guarda datos.

---

## Qué incluye

| Módulo | Qué hace |
|---|---|
| **Panel** | Existencias totales, ítems bajo el mínimo, agotados, reparto por clasificación y pedidos en curso |
| **Inventario** | Buscador por texto, filtro por clasificación y por estado de stock, vista de fichas o tabla, imágenes en Supabase Storage, exportación a Excel |
| **Pedidos** | Alta manual o **carga desde Excel**, seguimiento en cinco etapas, adjunto del archivo original, exportación a Excel |
| **Movimientos** | Kardex de ingresos, salidas y ajustes con saldo resultante |
| **Actividad** | Bitácora de usuarios: quién creó, editó o eliminó qué y cuándo |

Las cinco clasificaciones vienen del inventario cargado: Herramientas manuales y
eléctricas (27), Consumibles (28), Equipos (13), EPPs (8) y Activos (2).

---

## 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: pega `supabase/schema.sql` y ejecútalo.
   Crea tablas, RLS, triggers, funciones y los dos buckets de Storage.
3. Repite con `supabase/seed.sql`. Carga los 78 ítems y su saldo de apertura.
4. **Project Settings → API**: copia `Project URL` y la clave `anon public`.

### Acceso con Google

1. En [Google Cloud Console](https://console.cloud.google.com): **APIs y
   servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**
   (tipo *Aplicación web*).
2. En **URI de redirección autorizados** pega:
   `https://TU-PROYECTO.supabase.co/auth/v1/callback`
3. En Supabase: **Authentication → Providers → Google**. Activa el proveedor y
   pega el *Client ID* y el *Client Secret*.
4. En **Authentication → URL Configuration**:
   - *Site URL*: `https://tu-dominio.vercel.app`
   - *Redirect URLs*: `https://tu-dominio.vercel.app/auth/callback`
     y `http://localhost:3000/auth/callback`

### Roles

Toda cuenta nueva entra como `operario` (puede crear productos, movimientos y
pedidos). Para ascender a alguien:

```sql
update public.perfiles set rol = 'admin' where email = 'tu-correo@jblsac.com';
```

Roles disponibles: `admin`, `supervisor`, `operario`, `lectura`.
La bitácora completa solo la ven `admin` y `supervisor`; el resto ve la suya.

---

## 2. Google Analytics

1. En [analytics.google.com](https://analytics.google.com) crea una propiedad
   GA4 y un flujo de datos web.
2. Copia el **ID de medición** (`G-XXXXXXXXXX`).

Eventos que ya se envían: `login` (con `method: email` o `google`), `sign_up`,
`crear_producto`, `editar_producto`, `registrar_movimiento`, `crear_pedido`,
`cambiar_estado_pedido`, `importar_excel`, `exportar_excel`,
`subir_imagen_producto`, y `page_view` en cada navegación.

Cada sesión se asocia al `user_id` de Supabase y a una propiedad `rol_almacen`,
sin enviar nombres ni correos.

---

## 3. Local

```bash
npm install
cp .env.example .env.local   # completa las cuatro variables
npm run dev                  # http://localhost:3000
```

---

## 4. Vercel

1. Sube el proyecto a GitHub.
2. En [vercel.com](https://vercel.com): **Add New → Project** e importa el
   repositorio. Next.js se detecta solo.
3. En **Environment Variables** carga las cuatro:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon public` |
   | `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` |
   | `NEXT_PUBLIC_SITE_URL` | `https://tu-dominio.vercel.app` |

4. **Deploy**. Después vuelve a Supabase y añade el dominio definitivo en
   *URL Configuration*, o el acceso con Google fallará.

---

## Cargar un pedido desde Excel

En **Pedidos → Nuevo pedido → Cargar desde Excel**. El archivo necesita como
mínimo dos columnas; las tildes y las mayúsculas dan igual:

| Columna | Obligatoria | Nota |
|---|---|---|
| `DESCRIPCIÓN` | sí | también acepta `ITEM`, `PRODUCTO` o `MATERIAL` |
| `CANTIDAD` | sí | debe ser mayor que cero |
| `SKU` | no | si coincide, enlaza la línea al catálogo |
| `UNIDAD` | no | por defecto `UND` |
| `OBSERVACIÓN` | no | |

El botón **Plantilla** descarga un archivo de ejemplo ya formateado. Las líneas
se cargan en el formulario para revisarlas antes de registrar, y el archivo
original queda adjunto al pedido en Storage.

Las líneas que no encuentran producto en el catálogo se marcan como *fuera de
catálogo*: quedan registradas en el pedido pero no descuentan stock.

---

## Cómo se mueve el stock

El saldo de un producto nunca se edita a mano: siempre resulta del kardex.

- **Ingreso** — suma al saldo (compras, devoluciones).
- **Salida** — resta del saldo. Se rechaza si deja el saldo en negativo.
- **Ajuste** — fija el saldo al valor contado en un inventario físico.

Al pasar un pedido a **despachado**, cada línea enlazada al catálogo genera su
salida automática. Si falta stock en alguna, el despacho se detiene completo.

---

## Estructura

```
supabase/
  schema.sql              tablas, RLS, triggers, funciones y buckets
  seed.sql                78 ítems del inventario clasificado
src/
  middleware.ts           refresco de sesión y protección de rutas
  app/
    login/                acceso con correo y con Google
    auth/callback/        cierre del flujo OAuth
    (app)/panel/          resumen del almacén
    (app)/inventario/     catálogo, buscador y filtros
    (app)/pedidos/        alta, seguimiento e Excel
    (app)/movimientos/    kardex
    (app)/actividad/      bitácora de usuarios
  components/             navegación, formularios y UI compartida
  lib/
    supabase/             clientes de navegador, servidor y middleware
    excel.ts              importación y exportación con SheetJS
    analytics.tsx         GA4
    types.ts              tipos del dominio
```

---

## Seguridad

- **RLS activo en todas las tablas.** Ningún cliente lee ni escribe fuera de sus
  políticas, aunque alguien obtenga la clave `anon` (que es pública por diseño).
- **Rutas protegidas en el middleware**: sin sesión, todo redirige a `/login`.
- **Bucket `pedidos` privado**: los Excel adjuntos solo se descargan con un
  enlace firmado de 10 minutos. El bucket `productos` sí es público, porque son
  fotos de catálogo.
- **Bitácora por trigger**, no desde el cliente: no se puede omitir desde la
  interfaz.
