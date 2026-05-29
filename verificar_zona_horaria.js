// Script de verificación de zona horaria
// Ejecutar con: node verificar_zona_horaria.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verificar() {
  console.log('🔍 Verificando configuración de zona horaria...\n');
  
  try {
    // Configurar zona horaria
    await pool.query("SET timezone = 'America/Bogota'");
    
    // Verificar zona horaria
    const tzResult = await pool.query('SHOW timezone');
    console.log('✅ Zona horaria configurada:', tzResult.rows[0].TimeZone);
    
    // Obtener hora actual
    const timeResult = await pool.query('SELECT NOW() as hora_actual');
    console.log('🕐 Hora actual en la base de datos:', timeResult.rows[0].hora_actual);
    
    // Verificar datos limpios
    const viajesResult = await pool.query('SELECT COUNT(*) as count FROM viajes');
    const pasajerosResult = await pool.query('SELECT COUNT(*) as count FROM pasajeros');
    const notifResult = await pool.query('SELECT COUNT(*) as count FROM notificaciones');
    
    console.log('\n📊 Estado de la base de datos:');
    console.log('   - Viajes:', viajesResult.rows[0].count);
    console.log('   - Pasajeros:', pasajerosResult.rows[0].count);
    console.log('   - Notificaciones:', notifResult.rows[0].count);
    
    // Verificar datos que se mantienen
    const usuariosResult = await pool.query('SELECT COUNT(*) as count FROM usuarios');
    const embarcacionesResult = await pool.query('SELECT COUNT(*) as count FROM embarcaciones');
    const propietariosResult = await pool.query('SELECT COUNT(*) as count FROM propietarios');
    const tripulacionResult = await pool.query('SELECT COUNT(*) as count FROM tripulacion');
    
    console.log('\n✅ Datos de configuración mantenidos:');
    console.log('   - Usuarios:', usuariosResult.rows[0].count);
    console.log('   - Embarcaciones:', embarcacionesResult.rows[0].count);
    console.log('   - Propietarios:', propietariosResult.rows[0].count);
    console.log('   - Tripulación:', tripulacionResult.rows[0].count);
    
    console.log('\n✅ Verificación completada exitosamente');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Reinicia el servidor: npm run dev');
    console.log('   2. Recarga la aplicación en el navegador (Ctrl + Shift + R)');
    console.log('   3. Crea un nuevo viaje para verificar que las fechas sean correctas');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
