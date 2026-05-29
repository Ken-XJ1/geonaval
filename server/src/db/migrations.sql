CREATE TABLE IF NOT EXISTS incidentes (
  id SERIAL PRIMARY KEY,
  viaje_id INT REFERENCES viajes(id),
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  severidad VARCHAR(20) CHECK (severidad IN ('baja','media','alta','critica')) DEFAULT 'media',
  estado VARCHAR(20) CHECK (estado IN ('abierto','en_revision','cerrado')) DEFAULT 'abierto',
  reportado_por VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE viajes ADD COLUMN IF NOT EXISTS precio DECIMAL(12,2) DEFAULT 0;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS cierre_inscripcion TIMESTAMP;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS creado_por INT REFERENCES usuarios(id);

ALTER TABLE pasajeros ADD COLUMN IF NOT EXISTS usuario_id INT REFERENCES usuarios(id);

ALTER TABLE viaje_pasajeros ADD COLUMN IF NOT EXISTS usuario_id INT REFERENCES usuarios(id);
ALTER TABLE viaje_pasajeros ADD COLUMN IF NOT EXISTS asiento VARCHAR(20);
ALTER TABLE viaje_pasajeros ADD COLUMN IF NOT EXISTS precio_pagado DECIMAL(12,2);
ALTER TABLE viaje_pasajeros ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'efectivo';

ALTER TABLE viajes ADD COLUMN IF NOT EXISTS fecha_limite_inscripcion TIMESTAMP;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS precio DECIMAL(12,2) DEFAULT 0;
ALTER TABLE viaje_pasajeros ADD COLUMN IF NOT EXISTS usuario_id INT REFERENCES usuarios(id);

-- Fix Deletion: Add CASCADE if not present
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ubicaciones_gps_viaje_id_fkey') THEN
        ALTER TABLE ubicaciones_gps DROP CONSTRAINT ubicaciones_gps_viaje_id_fkey;
        ALTER TABLE ubicaciones_gps ADD CONSTRAINT ubicaciones_gps_viaje_id_fkey FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'incidentes_viaje_id_fkey') THEN
        ALTER TABLE incidentes DROP CONSTRAINT incidentes_viaje_id_fkey;
        ALTER TABLE incidentes ADD CONSTRAINT incidentes_viaje_id_fkey FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMP;

CREATE TABLE IF NOT EXISTS usuario_preferencias (
  usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  idioma VARCHAR(10) DEFAULT 'es',
  zona_horaria VARCHAR(50) DEFAULT 'America/Bogota',
  formato_fecha VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  tema VARCHAR(20) DEFAULT 'claro',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  exito BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LIMPIEZA DE DATOS OPERATIVOS (mantiene solo usuarios base)
-- Se ejecuta una sola vez usando tabla de control
-- ============================================================
CREATE TABLE IF NOT EXISTS _migraciones_control (
  nombre VARCHAR(100) PRIMARY KEY,
  ejecutado_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM _migraciones_control WHERE nombre = 'limpieza_datos_v1'
  ) THEN
    -- Limpiar en orden por dependencias
    DELETE FROM ubicaciones_gps;
    DELETE FROM incidentes;
    DELETE FROM notificaciones;
    DELETE FROM viaje_pasajeros;
    DELETE FROM viaje_tripulacion;
    DELETE FROM viajes;
    DELETE FROM pasajeros;
    DELETE FROM sesiones_usuario;
    DELETE FROM usuario_preferencias;

    -- Reiniciar secuencias
    ALTER SEQUENCE IF EXISTS viajes_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS pasajeros_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS incidentes_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS notificaciones_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS ubicaciones_gps_id_seq RESTART WITH 1;

    INSERT INTO _migraciones_control (nombre) VALUES ('limpieza_datos_v1');
    RAISE NOTICE 'Limpieza de datos operativos completada';
  END IF;
END $$;

-- Limpieza de embarcaciones, tripulación y propietarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM _migraciones_control WHERE nombre = 'limpieza_flota_v1'
  ) THEN
    DELETE FROM viaje_tripulacion;
    DELETE FROM viaje_pasajeros;
    DELETE FROM viajes;
    DELETE FROM tripulacion;
    DELETE FROM embarcaciones;
    DELETE FROM propietarios;

    ALTER SEQUENCE IF EXISTS tripulacion_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS embarcaciones_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS propietarios_id_seq RESTART WITH 1;

    INSERT INTO _migraciones_control (nombre) VALUES ('limpieza_flota_v1');
    RAISE NOTICE 'Limpieza de flota completada';
  END IF;
END $$;

-- Cambiar columna fecha_salida a TIMESTAMP WITHOUT TIME ZONE para evitar conversiones UTC
ALTER TABLE viajes ALTER COLUMN fecha_salida TYPE TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE viajes ALTER COLUMN cierre_inscripcion TYPE TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE viajes ALTER COLUMN fecha_limite_inscripcion TYPE TIMESTAMP WITHOUT TIME ZONE;

-- Renombrar cuenta de operador de prueba a "Operador 1"
UPDATE usuarios SET nombre = 'Operador 1' WHERE email = 'operador@geonaval.com';

-- Crear tripulante "Operador 1" para pruebas si no existe
INSERT INTO tripulacion (nombre, documento, rol, telefono, activo)
VALUES ('Operador 1', 'OP-001-TEST', 'capitan', '3000000001', true)
ON CONFLICT (documento) DO UPDATE SET nombre = 'Operador 1', activo = true;

-- Agregar campo fecha_llegada a viajes
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS fecha_llegada TIMESTAMP WITHOUT TIME ZONE;

-- Eliminar cuenta de cliente (ya no se usa)
DELETE FROM usuarios WHERE email = 'cliente@geonaval.com';

-- Cambiar columna created_at a TIMESTAMP WITHOUT TIME ZONE para evitar conversiones UTC
ALTER TABLE notificaciones ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- Columnas para bloqueo de cuentas por intentos fallidos
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos INT DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cuenta_bloqueada BOOLEAN DEFAULT false;

-- Configurar zona horaria de Colombia en la base de datos
ALTER DATABASE postgres SET timezone TO 'America/Bogota';

-- Limpiar datos para empezar de cero con fechas correctas
DELETE FROM ubicaciones_gps;
DELETE FROM viaje_pasajeros;
DELETE FROM viaje_tripulacion;
DELETE FROM incidentes;
DELETE FROM notificaciones;
DELETE FROM pasajeros;
DELETE FROM viajes;

-- Resetear secuencias
ALTER SEQUENCE viajes_id_seq RESTART WITH 1;
ALTER SEQUENCE pasajeros_id_seq RESTART WITH 1;
ALTER SEQUENCE incidentes_id_seq RESTART WITH 1;
ALTER SEQUENCE notificaciones_id_seq RESTART WITH 1;
ALTER SEQUENCE ubicaciones_gps_id_seq RESTART WITH 1;
