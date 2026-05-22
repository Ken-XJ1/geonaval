-- Ejecutar si ya tenías la BD creada: actualiza contraseñas de prueba
-- psql -U geonaval_user -d geonaval_db -f server/src/db/seed-users.sql

UPDATE usuarios SET password_hash = '$2b$10$04JZ3.WA0w8pJ.ZwbRVGi.nWiZm1pEWkd4o2QCXVlCfpfJOtZBpra', activo = true
WHERE email = 'test@test.com';

UPDATE usuarios SET password_hash = '$2b$10$LcHDh/AxSGvH3nYqr8nFsOvQ0tXFBURe.dFWGnp78eW7nOiU8/jMO', activo = true
WHERE email = 'admin@geonaval.com';

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Usuario Prueba', 'test@test.com',
   '$2b$10$04JZ3.WA0w8pJ.ZwbRVGi.nWiZm1pEWkd4o2QCXVlCfpfJOtZBpra', 'administrador')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash, activo = true;

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Operador Demo', 'operador@geonaval.com',
   '$2b$10$r4FKqCWDwc3yKRIkfPCEIuQoz2XW33rFXBQWutAVotKj545k8BKhK', 'operador'),
  ('Cliente Demo', 'cliente@geonaval.com',
   '$2b$10$SuXfLqiSzxUHMKNHzvno.OsEmT.2LWxlM4kBweFM/e7LQaChva8/i', 'cliente'),
  ('Autoridad Demo', 'autoridad@geonaval.com',
   '$2b$10$mvkC3z6af14i6bC4lVgExu4g2jKSW6uClQofX2MlfrDsd1GnqqRpa', 'autoridad')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, activo = true;
