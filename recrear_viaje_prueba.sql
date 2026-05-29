-- Recrear viaje de prueba Quibdó - Tadó
-- Basado en la imagen proporcionada

-- 1. Crear propietario
INSERT INTO propietarios (tipo, nombre, identificacion, telefono, estado)
VALUES ('natural', 'Miguel', 'PROP-001', '3001234567', 'activo')
ON CONFLICT (identificacion) DO NOTHING;

-- 2. Crear embarcación
INSERT INTO embarcaciones (nic, nombre, tipo, capacidad_pasajeros, estado, propietario_id)
VALUES (
  'EMB-MIGUEL-001',
  'Embarcación Miguel',
  'lancha',
  15,
  'operativa',
  (SELECT id FROM propietarios WHERE identificacion = 'PROP-001')
)
ON CONFLICT (nic) DO NOTHING;

-- 3. Crear tripulación
INSERT INTO tripulacion (nombre, documento, rol, telefono, activo)
VALUES 
  ('Kenneth Renses', 'TRIP-001', 'capitan', '3001111111', true),
  ('Amaya Winifred', 'TRIP-002', 'ayudante_cubierta', '3002222222', true)
ON CONFLICT (documento) DO NOTHING;

-- 4. Crear pasajeros (7 transportados)
INSERT INTO pasajeros (nombre, documento, telefono)
VALUES 
  ('Pasajero 1', 'PAS-001', '3001111111'),
  ('Pasajero 2', 'PAS-002', '3002222222'),
  ('Pasajero 3', 'PAS-003', '3003333333'),
  ('Pasajero 4', 'PAS-004', '3004444444'),
  ('Pasajero 5', 'PAS-005', '3005555555'),
  ('Pasajero 6', 'PAS-006', '3006666666'),
  ('Pasajero 7', 'PAS-007', '3007777777')
ON CONFLICT (documento) DO NOTHING;

-- 5. Crear el viaje V-003: Quibdó - Tadó
INSERT INTO viajes (
  id,
  fecha_salida,
  fecha_llegada,
  origen,
  destino,
  embarcacion_id,
  precio,
  estado,
  creado_por
)
VALUES (
  3,
  '2026-02-06 07:00:00',  -- 01/06/2026 07:00 (formato en imagen)
  '2026-02-06 12:00:00',  -- 02/06/2026 12:00 (formato en imagen)
  'Quibdó',
  'Tadó',
  (SELECT id FROM embarcaciones WHERE nic = 'EMB-MIGUEL-001'),
  50000,
  'finalizado',
  (SELECT id FROM usuarios WHERE email = 'admin@geonaval.com' LIMIT 1)
);

-- 6. Asignar tripulación al viaje
INSERT INTO viaje_tripulacion (viaje_id, tripulante_id)
VALUES 
  (3, (SELECT id FROM tripulacion WHERE documento = 'TRIP-001')),
  (3, (SELECT id FROM tripulacion WHERE documento = 'TRIP-002'))
ON CONFLICT DO NOTHING;

-- 7. Asignar pasajeros al viaje
INSERT INTO viaje_pasajeros (viaje_id, pasajero_id, asiento, precio_pagado, metodo_pago)
VALUES 
  (3, (SELECT id FROM pasajeros WHERE documento = 'PAS-001'), 'A1', 50000, 'efectivo'),
  (3, (SELECT id FROM pasajeros WHERE documento = 'PAS-002'), 'A2', 50000, 'efectivo'),
  (3, (SELECT id FROM pasajeros WHERE documento = 'PAS-003'), 'A3', 50000, 'efectivo'),
  (3, (SELECT id FROM pasajeros WHERE documento = 'PAS-004'), 'A4', 50000, 'efectivo'),
  (3, (SELECT id FROM pasajeros WHERE documento = 'PAS-005'), 'A5', 50000, 'efectivo'),
  (3, (SELECT id FROM pasajeros WHERE documento = 'PAS-006'), 'A6', 50000, 'efectivo'),
  (3, (SELECT id FROM pasajeros WHERE documento = 'PAS-007'), 'A7', 50000, 'efectivo')
ON CONFLICT DO NOTHING;

-- 8. Crear ubicaciones GPS (120 puntos registrados - 3.6 km recorrido)
-- Ruta aproximada de Quibdó a Tadó por el río Atrato
-- Coordenadas basadas en la ruta real

-- Punto de inicio (Quibdó)
INSERT INTO ubicaciones_gps (viaje_id, latitud, longitud, timestamp)
VALUES (3, 5.6947, -76.6611, '2026-02-06 07:00:00');

-- Puntos intermedios (simulando 120 puntos a lo largo de 3.6 km)
-- Generando puntos cada ~30 metros aproximadamente
DO $$
DECLARE
  i INTEGER;
  lat_start DECIMAL := 5.6947;
  lon_start DECIMAL := -76.6611;
  lat_end DECIMAL := 5.7270;
  lon_end DECIMAL := -76.6450;
  lat_step DECIMAL;
  lon_step DECIMAL;
  current_time TIMESTAMP := '2026-02-06 07:00:00';
BEGIN
  lat_step := (lat_end - lat_start) / 120.0;
  lon_step := (lon_end - lon_start) / 120.0;
  
  FOR i IN 1..119 LOOP
    INSERT INTO ubicaciones_gps (viaje_id, latitud, longitud, timestamp)
    VALUES (
      3,
      lat_start + (lat_step * i) + (random() * 0.0001 - 0.00005), -- Pequeña variación
      lon_start + (lon_step * i) + (random() * 0.0001 - 0.00005),
      current_time + (i * INTERVAL '150 seconds') -- ~2.5 minutos entre puntos
    );
  END LOOP;
END $$;

-- Punto final (cerca de Tadó)
INSERT INTO ubicaciones_gps (viaje_id, latitud, longitud, timestamp)
VALUES (3, 5.7270, -76.6450, '2026-02-06 12:00:00');

-- Actualizar secuencia de viajes para que el próximo sea 4
SELECT setval('viajes_id_seq', 3, true);

-- Verificar datos creados
SELECT 'Viaje creado:' as info;
SELECT id, origen, destino, fecha_salida, fecha_llegada, estado FROM viajes WHERE id = 3;

SELECT 'Tripulación asignada:' as info;
SELECT t.nombre, t.rol 
FROM viaje_tripulacion vt
JOIN tripulacion t ON t.id = vt.tripulante_id
WHERE vt.viaje_id = 3;

SELECT 'Pasajeros asignados:' as info;
SELECT COUNT(*) as total FROM viaje_pasajeros WHERE viaje_id = 3;

SELECT 'Puntos GPS registrados:' as info;
SELECT COUNT(*) as total FROM ubicaciones_gps WHERE viaje_id = 3;
