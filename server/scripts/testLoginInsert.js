const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase();

console.log('Probando inserción manual en intentos_login...\n');

// Intentar insertar manualmente
const query = 'INSERT INTO intentos_login (email, exitoso, ip_address, user_agent) VALUES (?, ?, ?, ?)';
const params = ['test@test.com', 1, '127.0.0.1', 'Test User Agent'];

db.run(query, params, function(err) {
  if (err) {
    console.error('❌ Error al insertar:', err);
  } else {
    console.log('✅ Inserción exitosa. ID:', this.lastID);
    
    // Verificar el total
    db.get('SELECT COUNT(*) as total FROM intentos_login', (err, row) => {
      if (err) {
        console.error('Error al contar:', err);
      } else {
        console.log(`Total de registros ahora: ${row.total}`);
      }
      db.close();
    });
  }
});
