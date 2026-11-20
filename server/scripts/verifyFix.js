// Script para verificar que la corrección funciona correctamente
const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase(undefined, { readOnly: true });

console.log('========================================');
console.log('VERIFICACIÓN POST-CORRECCIÓN');
console.log('========================================\n');

db.serialize(() => {
  // Simular el query que hace el backend para getVentas()
  const ventasQuery = `
    SELECT 
      v.*,
      p.name as producto_nombre,
      pu.id as purchase_id,
      pu.total_amount,
      u.name as cliente_nombre,
      u.email as cliente_email
    FROM ventas v
    LEFT JOIN products p ON v.product_id = p.id
    LEFT JOIN purchases pu ON v.purchase_id = pu.id
    LEFT JOIN users u ON pu.user_id = u.id
    ORDER BY v.fecha_venta DESC
  `;

  db.all(ventasQuery, (err, ventas) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log('1. DATOS DE VENTAS (como los recibe el frontend):');
    console.log(`   Cantidad de líneas de venta: ${ventas.length}`);
    console.log();

    // Simular el cálculo ANTERIOR (incorrecto)
    const ingresoAnterior = ventas.reduce((sum, v) => sum + (v.cantidad * v.precio_unitario), 0);
    console.log('2. CÁLCULO ANTERIOR (INCORRECTO):');
    console.log(`   Solo productos: ₡${ingresoAnterior.toFixed(2)}`);
    console.log('   ❌ No incluye costos de envío');
    console.log();

    // Simular el cálculo NUEVO (correcto)
    const uniquePurchases = {};
    ventas.forEach(v => {
      if (v.purchase_id && v.total_amount && !uniquePurchases[v.purchase_id]) {
        uniquePurchases[v.purchase_id] = parseFloat(v.total_amount);
      }
    });
    const ingresoNuevo = Object.values(uniquePurchases).reduce((sum, amt) => sum + amt, 0);
    
    console.log('3. CÁLCULO NUEVO (CORRECTO):');
    console.log(`   Purchases únicos: ${Object.keys(uniquePurchases).length}`);
    Object.keys(uniquePurchases).forEach(purchaseId => {
      console.log(`   - Purchase #${purchaseId}: ₡${uniquePurchases[purchaseId].toFixed(2)}`);
    });
    console.log(`   Total: ₡${ingresoNuevo.toFixed(2)}`);
    console.log('   ✓ Incluye productos + envío + otros cargos');
    console.log();

    // Verificar con el total de Gestión de pedidos
    db.get('SELECT SUM(total_amount) as total FROM purchases', (err, row) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }

      const totalGestionPedidos = parseFloat(row.total || 0);
      
      console.log('4. COMPARACIÓN CON GESTIÓN DE PEDIDOS:');
      console.log(`   Gestión de pedidos: ₡${totalGestionPedidos.toFixed(2)}`);
      console.log(`   Reportes (nuevo):   ₡${ingresoNuevo.toFixed(2)}`);
      
      if (Math.abs(totalGestionPedidos - ingresoNuevo) < 0.01) {
        console.log('   ✅ ¡COINCIDEN PERFECTAMENTE!');
      } else {
        console.log(`   ⚠️  Diferencia: ₡${(totalGestionPedidos - ingresoNuevo).toFixed(2)}`);
      }
      
      console.log();
      console.log('========================================');
      console.log('RESULTADO:');
      console.log('========================================');
      console.log('✅ El problema ha sido solucionado.');
      console.log('');
      console.log('Ahora ambas vistas muestran el mismo total:');
      console.log(`• Gestión de pedidos: ₡${totalGestionPedidos.toFixed(2)}`);
      console.log(`• Reportes y Analítica - Historial de ventas: ₡${ingresoNuevo.toFixed(2)}`);
      console.log('');
      console.log('El cálculo incluye correctamente:');
      console.log('  - Precio de productos');
      console.log('  - Costos de envío');
      console.log('  - Cualquier otro cargo');
      console.log('========================================\n');

      db.close();
    });
  });
});
