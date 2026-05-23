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
