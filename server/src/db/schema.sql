CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) CHECK (rol IN 
    ('administrador','operador','cliente','autoridad')) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS propietarios (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(10) CHECK (tipo IN ('natural','empresa')) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  identificacion VARCHAR(50) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT,
  nit VARCHAR(50),
  razon_social VARCHAR(150),
  matricula_mercantil VARCHAR(100),
  fecha_registro DATE,
  estado VARCHAR(10) DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS embarcaciones (
  id SERIAL PRIMARY KEY,
  nic VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(50),
  capacidad_pasajeros INT NOT NULL,
  motor VARCHAR(100),
  potencia VARCHAR(50),
  dimensiones VARCHAR(100),
  estado VARCHAR(20) CHECK (estado IN 
    ('operativa','mantenimiento','fuera_servicio','inspeccion'))
    DEFAULT 'operativa',
  propietario_id INT REFERENCES propietarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tripulacion (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  documento VARCHAR(50) UNIQUE NOT NULL,
  rol VARCHAR(30) CHECK (rol IN 
    ('capitan','copiloto','ayudante_cubierta',
     'motorista','auxiliar_pasajeros')) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(100),
  licencias TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pasajeros (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  documento VARCHAR(50) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS viajes (
  id SERIAL PRIMARY KEY,
  fecha_salida TIMESTAMP NOT NULL,
  origen VARCHAR(100) NOT NULL,
  destino VARCHAR(100) NOT NULL,
  embarcacion_id INT REFERENCES embarcaciones(id),
  estado VARCHAR(20) CHECK (estado IN 
    ('programado','en_curso','finalizado','cancelado'))
    DEFAULT 'programado',
  justificacion_cancelacion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS viaje_tripulacion (
  viaje_id INT REFERENCES viajes(id) ON DELETE CASCADE,
  tripulante_id INT REFERENCES tripulacion(id),
  PRIMARY KEY (viaje_id, tripulante_id)
);

CREATE TABLE IF NOT EXISTS viaje_pasajeros (
  viaje_id INT REFERENCES viajes(id) ON DELETE CASCADE,
  pasajero_id INT REFERENCES pasajeros(id),
  PRIMARY KEY (viaje_id, pasajero_id)
);

CREATE TABLE IF NOT EXISTS ubicaciones_gps (
  id SERIAL PRIMARY KEY,
  viaje_id INT REFERENCES viajes(id),
  latitud DECIMAL(10,8) NOT NULL,
  longitud DECIMAL(11,8) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Usuarios de prueba (contraseñas en texto plano documentadas para desarrollo)
-- test@test.com          / 123456
-- admin@geonaval.com     / admin123
-- operador@geonaval.com  / operador123
-- cliente@geonaval.com   / cliente123
-- autoridad@geonaval.com / autoridad123

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Usuario Prueba', 'test@test.com',
   '$2b$10$04JZ3.WA0w8pJ.ZwbRVGi.nWiZm1pEWkd4o2QCXVlCfpfJOtZBpra', 'administrador'),
  ('Administrador GeoNaval', 'admin@geonaval.com',
   '$2b$10$LcHDh/AxSGvH3nYqr8nFsOvQ0tXFBURe.dFWGnp78eW7nOiU8/jMO', 'administrador'),
  ('Operador Demo', 'operador@geonaval.com',
   '$2b$10$r4FKqCWDwc3yKRIkfPCEIuQoz2XW33rFXBQWutAVotKj545k8BKhK', 'operador'),
  ('Cliente Demo', 'cliente@geonaval.com',
   '$2b$10$SuXfLqiSzxUHMKNHzvno.OsEmT.2LWxlM4kBweFM/e7LQaChva8/i', 'cliente'),
  ('Autoridad Demo', 'autoridad@geonaval.com',
   '$2b$10$mvkC3z6af14i6bC4lVgExu4g2jKSW6uClQofX2MlfrDsd1GnqqRpa', 'autoridad')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = true;
