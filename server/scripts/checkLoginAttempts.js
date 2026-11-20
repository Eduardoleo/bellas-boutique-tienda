const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase(undefined, { readOnly: true });

console.log('Verificando intentos de login...\n');

db.all('SELECT * FROM intentos_login ORDER BY fecha_intento DESC LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Total de registros en intentos_login: ${rows.length}`);
  console.log('\nÚltimos intentos:');
  console.log('═'.repeat(100));
  
  rows.forEach(row => {
    const resultado = row.exitoso ? '✅ EXITOSO' : '❌ FALLIDO';
    console.log(`ID: ${row.id} | ${resultado}`);
    console.log(`   Email: ${row.email}`);
    console.log(`   IP: ${row.ip_address}`);
    console.log(`   Fecha: ${row.fecha_intento}`);
    console.log('─'.repeat(100));
  });

  db.close();
});
