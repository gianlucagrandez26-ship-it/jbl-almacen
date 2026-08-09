-- =====================================================================
-- JBL SAC · Carga inicial de inventario
-- Origen: Clasificacion_Inventario_Happyland.xlsx (hoja "Inventario Clasificado")
-- 78 ítems · 5 grupos de clasificación
-- Ejecutar DESPUÉS de schema.sql
-- =====================================================================

insert into public.categorias (codigo, nombre, descripcion, orden) values
  ('HER', 'Herramientas manuales y eléctricas', 'Herramienta de mano, de poder y accesorios de maniobra', 1),
  ('EQP', 'Equipos',                            'Equipos de soldadura, izaje, iluminación y comunicación', 2),
  ('EPP', 'EPPs',                               'Equipos de protección personal y respuesta a emergencias', 3),
  ('CON', 'Consumibles',                        'Material de consumo, fungibles y suministros', 4),
  ('ACT', 'Activos',                            'Activos de obra: andamios, plataformas y estructuras', 5)
on conflict (codigo) do nothing;

insert into public.productos
  (sku, item_origen, descripcion, categoria_id, cantidad, unidad, stock_minimo, observacion)
select v.sku, v.item, v.descripcion, c.id, v.cantidad, v.unidad, v.stock_minimo, v.observacion
from (values
  ('JBL-HER-001', 1, 'Aproximadores', 'HER', 4, 'UND', 1, NULL),
  ('JBL-HER-002', 2, 'Dados', 'HER', 4, 'UND', 1, 'Comprar de acuerdo con la medida de la tuerca disponible en almacén para el perno de 3/4" de las bridas de columnas y vigas.'),
  ('JBL-HER-003', 3, 'Punzones de 50cm', 'HER', 20, 'UND', 4, 'Acerados inoxidable o muelle de 1 1/4 de diámetro'),
  ('JBL-HER-004', 4, 'Llaves de mixta 1" 25mm', 'HER', 2, 'UND', 1, 'Comprar de acuerdo con la medida de la tuerca disponible en almacén para el perno de 1" de la plancha base.'),
  ('JBL-HER-005', 5, 'Llaves de mixta 3/4"', 'HER', 5, 'UND', 1, 'Comprar de acuerdo con la medida de la tuerca disponible en almacén para el perno de 3/4" de las bridas de columnas y vigas.'),
  ('JBL-HER-006', 6, 'Llaves francesas de 1 1/2" 38mm', 'HER', 3, 'UND', 1, NULL),
  ('JBL-HER-007', 7, 'Torquímetro de', 'HER', 2, 'UND', 1, NULL),
  ('JBL-CON-001', 8, 'Pernos de 3/4", arandelas y tuercas', 'CON', 1574, 'UND', 315, 'Revisar en almacén la cantidad de pernos, arandelas (Considerar que aumentarán debido a que se colocara 4 arandelas por perno) y tuercas.'),
  ('JBL-CON-002', 9, 'Pernos de 1", arandelas y tuercas', 'CON', 230, 'UND', 46, 'Revisar en almacén la cantidad de pernos, arandelas y tuercas.'),
  ('JBL-EQP-001', 10, 'Eslingas 2tn', 'EQP', 6, 'UND', 1, '2metros'),
  ('JBL-HER-008', 11, 'Grilletes de 1"', 'HER', 4, 'UND', 1, NULL),
  ('JBL-ACT-001', 12, 'Andamios', 'ACT', 12, 'CPO', 2, 'Se esta considerando los andamios que tenemos en almacén'),
  ('JBL-ACT-002', 13, 'Plataformas', 'ACT', 8, 'UND', 2, 'Se esta considerando los que se tiene en almacén'),
  ('JBL-HER-009', 14, 'Garruchas', 'HER', 16, 'UND', 3, NULL),
  ('JBL-CON-003', 15, 'Alambre nro. 8', 'CON', 1, 'UND', 1, 'Para amarrar andamios'),
  ('JBL-EQP-002', 16, 'Escaleras telescópicas y de tijera', 'EQP', 0, 'UND', 1, 'Las que se tenga disponible en almacén'),
  ('JBL-EQP-003', 17, 'Lámparas', 'EQP', 10, 'UND', 2, 'Se requiere área de trabajo bien iluminada'),
  ('JBL-HER-010', 18, 'Buril', 'HER', 6, 'UND', 1, NULL),
  ('JBL-HER-011', 19, 'Combas de 4 lib', 'HER', 10, 'UND', 2, NULL),
  ('JBL-HER-012', 20, 'Combas de 20 lib', 'HER', 1, 'UND', 1, NULL),
  ('JBL-HER-013', 21, 'Nivel Grande imán', 'HER', 6, 'UND', 1, 'longitud 2 @3 mtrs'),
  ('JBL-HER-014', 22, 'Nivel pequeño con imán', 'HER', 6, 'UND', 1, NULL),
  ('JBL-HER-015', 23, 'Nivel Laser', 'HER', 1, 'UND', 1, NULL),
  ('JBL-HER-016', 24, 'Escuadra de 24"', 'HER', 2, 'UND', 1, NULL),
  ('JBL-EPP-001', 25, 'Sogas para viento de 50 m y línea de vida', 'EPP', 10, 'UND', 2, 'de 5/8"'),
  ('JBL-EQP-004', 26, 'Máquina Miller de Soldar', 'EQP', 1, 'UND', 1, NULL),
  ('JBL-CON-004', 27, 'Alambre de soldar 1.2', 'CON', 3, 'UND', 1, NULL),
  ('JBL-CON-005', 28, 'Mezcla', 'CON', 2, 'BOT', 1, NULL),
  ('JBL-EQP-005', 29, 'Maquina Monofásica de soldar', 'EQP', 2, 'UND', 1, NULL),
  ('JBL-CON-006', 30, 'Soldadura 6011', 'CON', 10, 'KG', 2, NULL),
  ('JBL-CON-007', 31, 'Soldadura 7018', 'CON', 10, 'KG', 2, NULL),
  ('JBL-HER-017', 32, 'Amoladora de 9"', 'HER', 1, 'UND', 1, NULL),
  ('JBL-HER-018', 33, 'Amoladora de 7"', 'HER', 2, 'UND', 1, NULL),
  ('JBL-HER-019', 34, 'Amoladora de 4"', 'HER', 3, 'UND', 1, NULL),
  ('JBL-CON-008', 35, 'Disco de corte de 4"', 'CON', 1, 'CJA', 1, NULL),
  ('JBL-CON-009', 36, 'Disco de corte de 7"', 'CON', 1, 'CJA', 1, NULL),
  ('JBL-CON-010', 37, 'Disco de desbaste de 4"', 'CON', 1, 'CJA', 1, NULL),
  ('JBL-CON-011', 38, 'Disco de corte de 9"', 'CON', 10, 'UND', 2, NULL),
  ('JBL-CON-012', 39, 'Pulifan', 'CON', 2, 'CJA', 1, NULL),
  ('JBL-CON-013', 40, 'Pintura base', 'CON', 2, 'JGO', 1, NULL),
  ('JBL-CON-014', 41, 'Pintura de acabado', 'CON', 2, 'JGO', 1, NULL),
  ('JBL-CON-015', 42, 'Brocha de 2 pulgadas', 'CON', 10, 'UND', 2, NULL),
  ('JBL-HER-020', 43, 'Cincel plano', 'HER', 2, 'UND', 1, NULL),
  ('JBL-HER-021', 44, 'Cincel punta', 'HER', 2, 'UND', 1, NULL),
  ('JBL-EPP-002', 45, 'Arnés', 'EPP', 12, 'UND', 2, NULL),
  ('JBL-CON-016', 46, 'Trapo industrial grande', 'CON', 50, 'KG', 10, 'color blanco'),
  ('JBL-EQP-006', 47, 'Caballetes pequeños', 'EQP', 15, 'UND', 3, NULL),
  ('JBL-CON-017', 48, 'Cordel', 'CON', 2, 'UND', 1, NULL),
  ('JBL-EQP-007', 49, 'Estocas', 'EQP', 2, 'UND', 1, NULL),
  ('JBL-EQP-008', 50, 'Winches eléctricas', 'EQP', 2, 'UND', 1, NULL),
  ('JBL-CON-018', 51, 'Certificado de pernos de 3/4"', 'CON', 1, 'UND', 1, NULL),
  ('JBL-CON-019', 52, 'Driza de 3/8"', 'CON', 3, 'ROL', 1, NULL),
  ('JBL-EQP-009', 53, 'Extintore', 'EQP', 4, 'UND', 1, NULL),
  ('JBL-EPP-003', 54, 'camilla', 'EPP', 1, 'UND', 1, NULL),
  ('JBL-EPP-004', 55, 'cuellera', 'EPP', 1, 'UND', 1, NULL),
  ('JBL-EPP-005', 56, 'botiquín básico', 'EPP', 1, 'UND', 1, NULL),
  ('JBL-CON-020', 57, 'frazada', 'CON', 1, 'UND', 1, NULL),
  ('JBL-CON-021', 58, 'malla Rachel', 'CON', 1, 'ROL', 1, NULL),
  ('JBL-EQP-010', 59, 'conos de seguridad', 'EQP', 10, 'UND', 2, NULL),
  ('JBL-CON-022', 60, 'cinta de seguridad', 'CON', 2, 'UND', 1, NULL),
  ('JBL-CON-023', 61, 'malla de seguridad', 'CON', 2, 'UND', 1, NULL),
  ('JBL-EPP-006', 62, 'Silbado', 'EPP', 2, 'UND', 1, NULL),
  ('JBL-EQP-011', 63, 'Radios de comunicación', 'EQP', 6, 'UND', 1, NULL),
  ('JBL-HER-022', 64, 'Baldes de 20 litros', 'HER', 8, 'UND', 2, 'uso para pernos'),
  ('JBL-HER-023', 65, 'wincha de 30mts', 'HER', 2, 'UND', 1, NULL),
  ('JBL-EQP-012', 66, 'Plumín para maniobras', 'EQP', 1, 'UND', 1, 'para maniobra'),
  ('JBL-CON-024', 67, 'stretch film', 'CON', 8, 'ROL', 2, NULL),
  ('JBL-CON-025', 68, 'Cartón corrugado', 'CON', 1, 'ROL', 1, NULL),
  ('JBL-HER-024', 69, 'poleas 2"', 'HER', 16, 'ROL', 3, 'para izaje de lona'),
  ('JBL-CON-026', 70, 'Plástico', 'CON', 2, 'ROL', 1, 'para proteger la lona'),
  ('JBL-CON-027', 71, 'Bencina', 'CON', 1, 'GLN', 1, NULL),
  ('JBL-EPP-007', 72, 'Botas quirúrgicas', 'EPP', 1, 'PQT', 1, NULL),
  ('JBL-HER-025', 73, 'Kuter', 'HER', 12, 'UND', 2, 'de buna marca para mantener el filo'),
  ('JBL-CON-028', 74, 'Agua en caja', 'CON', 10, 'CJA', 2, NULL),
  ('JBL-EPP-008', 75, 'Guantes Blancos', 'EPP', 24, 'UND', 5, NULL),
  ('JBL-EQP-013', 76, 'tablero eléctrico', 'EQP', 2, 'UND', 1, NULL),
  ('JBL-HER-026', 77, 'Extensión monofásico', 'HER', 6, 'UND', 1, NULL),
  ('JBL-HER-027', 78, 'Extensión trifásico', 'HER', 3, 'UND', 1, NULL)
) as v(sku, item, descripcion, cat_codigo, cantidad, unidad, stock_minimo, observacion)
join public.categorias c on c.codigo = v.cat_codigo
on conflict (sku) do nothing;

-- Kardex de apertura.
-- Se usa 'ajuste' y no 'ingreso': el trigger fn_aplicar_movimiento FIJA el saldo con
-- un ajuste, mientras que un ingreso lo SUMARÍA al saldo ya cargado y lo duplicaría.
-- saldo_resultante lo calcula el propio trigger, por eso no se envía.
insert into public.movimientos (producto_id, tipo, cantidad, motivo)
select id, 'ajuste', cantidad, 'Saldo de apertura — inventario clasificado'
from public.productos
where cantidad > 0;
