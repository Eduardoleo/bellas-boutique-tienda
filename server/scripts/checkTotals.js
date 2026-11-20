// Script para comparar los totales entre purchases y ventas
const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase(undefined, { readOnly: true });

console.log('========================================');
console.log('VERIFICACIÓN DE TOTALES');
console.log('========================================\n');

db.serialize(() => {
  // Total de purchases
  db.get('SELECT SUM(total_amount) as total FROM purchases', (err, row) => {
    if (err) {
      console.error('Error al consultar purchases:', err);
      return;
    }
    console.log('1. INGRESO TOTAL EN PURCHASES (Gestión de pedidos)');
    console.log(`   Total: ₡${parseFloat(row.total || 0).toFixed(2)}`);
    console.log();
  });

  // Total de ventas
  db.get('SELECT SUM(cantidad * precio_unitario) as total FROM ventas', (err, row) => {
    if (err) {
      console.error('Error al consultar ventas:', err);
      return;
    }
    console.log('2. INGRESO TOTAL EN VENTAS (Reportes y Analítica - Historial de ventas)');
    console.log(`   Total: ₡${parseFloat(row.total || 0).toFixed(2)}`);
    console.log();
  });

  // Contar registros
  db.get('SELECT COUNT(*) as count FROM purchases', (err, row) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log(`3. CANTIDAD DE PEDIDOS: ${row.count}`);
  });

  db.get('SELECT COUNT(*) as count FROM ventas', (err, row) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log(`4. CANTIDAD DE VENTAS (líneas): ${row.count}`);
    console.log();
  });

  // Mostrar detalles de cada purchase con sus ventas
  db.all(`
    SELECT 
      p.id,
      p.total_amount,
      p.created_at,
      GROUP_CONCAT(v.id) as venta_ids,
      SUM(v.cantidad * v.precio_unitario) as total_ventas
    FROM purchases p
    LEFT JOIN ventas v ON p.id = v.purchase_id
    GROUP BY p.id
    ORDER BY p.id
  `, (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log('5. DETALLE COMPRA POR COMPRA:');
    console.log('   ID | Total Purchase | Total Ventas | Diferencia | Ventas IDs');
    console.log('   ' + '-'.repeat(70));
    
    let totalPurchases = 0;
    let totalVentas = 0;
    let purchasesConProblema = [];

    rows.forEach(row => {
      const purchaseTotal = parseFloat(row.total_amount || 0);
      const ventasTotal = parseFloat(row.total_ventas || 0);
      const diferencia = purchaseTotal - ventasTotal;
      
      totalPurchases += purchaseTotal;
      totalVentas += ventasTotal;

      const status = Math.abs(diferencia) > 0.01 ? '⚠️' : '✓';
      console.log(`   ${status} #${row.id} | ₡${purchaseTotal.toFixed(2)} | ₡${ventasTotal.toFixed(2)} | ₡${diferencia.toFixed(2)} | ${row.venta_ids || 'N/A'}`);
      
      if (Math.abs(diferencia) > 0.01) {
        purchasesConProblema.push({
          id: row.id,
          diferencia: diferencia
        });
      }
    });

    console.log('   ' + '-'.repeat(70));
    console.log(`   TOTALES: ₡${totalPurchases.toFixed(2)} | ₡${totalVentas.toFixed(2)} | ₡${(totalPurchases - totalVentas).toFixed(2)}`);
    console.log();

    if (purchasesConProblema.length > 0) {
      console.log('6. COMPRAS CON DISCREPANCIAS:');
      purchasesConProblema.forEach(p => {
        console.log(`   ⚠️  Purchase #${p.id}: Diferencia de ₡${p.diferencia.toFixed(2)}`);
      });
      console.log();
      console.log('CONCLUSIÓN:');
      console.log(`   Hay ${purchasesConProblema.length} compra(s) donde el total en "purchases"`);
      console.log(`   NO coincide con la suma de sus ventas en la tabla "ventas".`);
      console.log(`   Esto explica la diferencia de ₡${(totalPurchases - totalVentas).toFixed(2)}.`);
    } else {
      console.log('✓ Todos los totales coinciden correctamente');
    }

    console.log();
    console.log('========================================');
    db.close();
  });
});
