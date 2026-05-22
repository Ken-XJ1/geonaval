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
