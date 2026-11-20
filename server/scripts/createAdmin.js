const { loadEnvironment } = require('../src/config/databasePaths');
loadEnvironment();
if (!process.env.DEMO_ADMIN_PASSWORD) throw new Error("Configure DEMO_ADMIN_PASSWORD para una base de prueba");
const { openScriptDatabase } = require('../src/config/scriptDatabase');
const bcrypt = require('bcrypt');
const path = require('path');


async function createAdmin() {
  return new Promise(async (resolve, reject) => {
    const db = openScriptDatabase(async (err) => {
      if (err) {
        console.error('Error al conectar a la base de datos:', err);
        reject(err);
        return;
      }
      
      console.log('===========================================');
      console.log('   CREAR ADMINISTRADOR PRINCIPAL');
      console.log('===========================================\n');

      // Datos del administrador
      const adminData = {
        cedula: '1-1111-1111',
        name: 'Administrador',
        apellidos: 'Principal',
        email: 'admin@bellasboutique.com',
        password: process.env.DEMO_ADMIN_PASSWORD,
        phone: '8888-8888',
        address: 'San José, Costa Rica',
        rol: 'Administrador'
      };

      console.log('Datos del administrador:');
      console.log(`  Email: ${adminData.email}`);
      console.log(`  Rol: ${adminData.rol}\n`);

      try {
        // Verificar si ya existe
        db.get('SELECT id FROM users WHERE email = ?', [adminData.email], async (err, row) => {
          if (err) {
            console.error('Error al verificar usuario:', err);
            db.close();
            reject(err);
            return;
          }

          if (row) {
            console.log('⚠️  El administrador ya existe en la base de datos');
            console.log(`   ID: ${row.id}`);
            db.close();
            resolve(row.id);
            return;
          }

          // Hash de la contraseña
          const hashedPassword = await bcrypt.hash(adminData.password, 10);

          // Insertar administrador
          const query = `
            INSERT INTO users (cedula, name, apellidos, email, password, phone, address, rol, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(
            query,
            [
              adminData.cedula,
              adminData.name,
              adminData.apellidos,
              adminData.email,
              hashedPassword,
              adminData.phone,
              adminData.address,
              adminData.rol,
              'Activo'
            ],
            function(err) {
              if (err) {
                console.error('✗ Error al crear administrador:', err);
                db.close();
                reject(err);
                return;
              }

              console.log('✓ Administrador creado exitosamente');
              console.log(`  ID: ${this.lastID}`);
              console.log('\n===========================================');
              console.log('  IMPORTANTE: Guarda estas credenciales');
              console.log('===========================================');
              console.log(`  Email: ${adminData.email}`);
              console.log('===========================================\n');

              db.close((err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(this.lastID);
                }
              });
            }
          );
        });
      } catch (error) {
        console.error('Error:', error);
        db.close();
        reject(error);
      }
    });
  });
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createAdmin()
    .then(() => {
      console.log('Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error en el proceso:', err);
      process.exit(1);
    });
}

module.exports = createAdmin;
