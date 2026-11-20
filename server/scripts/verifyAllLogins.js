const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase(undefined, { readOnly: true });

console.log('Verificando TODOS los intentos de login...\n');

db.all('SELECT * FROM intentos_login ORDER BY id DESC LIMIT 20', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Total de registros encontrados: ${rows.length}\n`);
  console.log('═'.repeat(120));
  
  rows.forEach((row, index) => {
    const resultado = row.exitoso ? '✅ EXITOSO' : '❌ FALLIDO';
    console.log(`${index + 1}. ID: #${row.id} | ${resultado}`);
    console.log(`   Email: ${row.email}`);
    console.log(`   IP: ${row.ip_address}`);
    console.log(`   User Agent: ${row.user_agent ? row.user_agent.substring(0, 60) + '...' : 'N/A'}`);
    console.log(`   Fecha: ${row.fecha_intento}`);
    console.log('─'.repeat(120));
  });

  db.close();
});
