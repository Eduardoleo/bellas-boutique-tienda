const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');


console.log('🔄 Iniciando migración: Agregar columnas de envío...\n');

const db = openScriptDatabase((err) => {
  if (err) {
    console.error('No se pudo abrir la base SQLite existente.');
    process.exit(1);
  }
  console.log('✓ Conectado a la base de datos\n');
});

// Función para verificar si una columna existe
function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const exists = rows.some(row => row.name === columnName);
        resolve(exists);
      }
    });
  });
}

// Función para agregar columna si no existe
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  return new Promise(async (resolve, reject) => {
    try {
      const exists = await columnExists(tableName, columnName);
      
      if (exists) {
        console.log(`⏭️  Columna '${columnName}' ya existe en '${tableName}'`);
        resolve(false);
      } else {
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ Columna '${columnName}' agregada a '${tableName}'`);
            resolve(true);
          }
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Ejecutar migraciones
async function runMigration() {
  try {
    console.log('📋 Agregando columnas faltantes a la tabla "purchases"...\n');
    
    // Agregar columna shipping_address
    await addColumnIfNotExists('purchases', 'shipping_address', 'TEXT');
    
    // Agregar columna shipping_notes
    await addColumnIfNotExists('purchases', 'shipping_notes', 'TEXT');
    
    console.log('\n✅ Migración completada exitosamente');
    console.log('📊 Las columnas de envío están ahora disponibles\n');
    
  } catch (error) {
    console.error('La migración no pudo completarse. Verifique la base y sus columnas; no se recreó la base.');
    process.exitCode = 1;
  } finally {
    db.close((err) => {
      if (err) {
        console.error('No se pudo cerrar la conexión SQLite.');
        process.exitCode = 1;
      }

    });
  }
}

// Ejecutar
runMigration();
