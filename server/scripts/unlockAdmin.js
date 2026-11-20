// Script para desbloquear el usuario admin
const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase();

console.log('🔓 Desbloqueando usuario admin...\n');

db.serialize(() => {
  // Primero obtener info del admin
  db.all("SELECT email, name, rol FROM users WHERE rol = 'Administrador'", (err, admins) => {
    if (err) {
      console.error('❌ Error al buscar admin:', err);
      db.close();
      return;
    }

    if (admins.length === 0) {
      console.log('⚠️  No se encontró ningún usuario con rol Administrador');
      db.close();
      return;
    }

    console.log('📋 Administradores encontrados:');
    admins.forEach(admin => {
      console.log(`   - ${admin.name} (${admin.email})`);
    });

    // Eliminar intentos de login
    db.run(
      "DELETE FROM intentos_login WHERE email IN (SELECT email FROM users WHERE rol = 'Administrador')",
      function(err) {
        if (err) {
          console.error('❌ Error al eliminar intentos:', err);
        } else {
          console.log(`\n✅ Se eliminaron ${this.changes} intentos de login`);
          console.log('✅ Admin desbloqueado correctamente\n');
        }
        db.close();
      }
    );
  });
});
