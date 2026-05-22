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
