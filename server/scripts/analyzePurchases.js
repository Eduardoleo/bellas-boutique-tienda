// Script para ver los detalles de las compras problemáticas
const { openScriptDatabase } = require('../src/config/scriptDatabase');
const path = require('path');

const db = openScriptDatabase(undefined, { readOnly: true });

console.log('========================================');
console.log('ANÁLISIS DETALLADO DE DISCREPANCIAS');
console.log('========================================\n');

db.serialize(() => {
  // Para cada compra, mostrar purchase_items y ventas
  [1, 2].forEach(purchaseId => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`COMPRA #${purchaseId}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Datos de la compra
    db.get('SELECT * FROM purchases WHERE id = ?', [purchaseId], (err, purchase) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      
      console.log('\n1. DATOS DE LA COMPRA (tabla purchases):');
      console.log(`   Total registrado: ₡${parseFloat(purchase.total_amount).toFixed(2)}`);
      console.log(`   Método de pago: ${purchase.payment_method}`);
      console.log(`   Fecha: ${purchase.created_at}`);
      console.log(`   Estado: ${purchase.status}`);
    });

    // Purchase items
    db.all(`
      SELECT 
        pi.*,
        p.name as product_name
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pi.purchase_id = ?
    `, [purchaseId], (err, items) => {
      if (err) {
        console.error('Error:', err);
        return;
      }

      console.log('\n2. ITEMS DE LA COMPRA (tabla purchase_items):');
      let totalItems = 0;
      items.forEach(item => {
        const subtotal = item.quantity * parseFloat(item.price);
        totalItems += subtotal;
        console.log(`   - ${item.product_name}`);
        console.log(`     Cantidad: ${item.quantity} × ₡${parseFloat(item.price).toFixed(2)} = ₡${subtotal.toFixed(2)}`);
      });
      console.log(`   ---`);
      console.log(`   Suma de items: ₡${totalItems.toFixed(2)}`);
    });

    // Ventas
    db.all(`
      SELECT 
        v.*,
        p.name as product_name
      FROM ventas v
      LEFT JOIN products p ON v.product_id = p.id
      WHERE v.purchase_id = ?
    `, [purchaseId], (err, ventas) => {
      if (err) {
        console.error('Error:', err);
        return;
      }

      console.log('\n3. REGISTROS EN VENTAS (tabla ventas):');
      let totalVentas = 0;
      ventas.forEach(venta => {
        const subtotal = venta.cantidad * parseFloat(venta.precio_unitario);
        totalVentas += subtotal;
        console.log(`   - ${venta.product_name}`);
        console.log(`     Cantidad: ${venta.cantidad} × ₡${parseFloat(venta.precio_unitario).toFixed(2)} = ₡${subtotal.toFixed(2)}`);
      });
      console.log(`   ---`);
      console.log(`   Suma de ventas: ₡${totalVentas.toFixed(2)}`);
      
      // Comparar con el total de la compra
      db.get('SELECT total_amount FROM purchases WHERE id = ?', [purchaseId], (err, purchase) => {
        if (err) return;
        const purchaseTotal = parseFloat(purchase.total_amount);
        const diferencia = purchaseTotal - totalVentas;
        console.log('\n4. ANÁLISIS:');
        console.log(`   Total en purchases:  ₡${purchaseTotal.toFixed(2)}`);
        console.log(`   Total en ventas:     ₡${totalVentas.toFixed(2)}`);
        console.log(`   Diferencia:          ₡${diferencia.toFixed(2)}`);
        
        if (Math.abs(diferencia) > 0.01) {
          console.log(`   ⚠️  PROBLEMA: Los montos NO coinciden!`);
          console.log(`   Posible causa: El total en "purchases" incluye cargos adicionales`);
          console.log(`                  (como envío) que no están en "ventas".`);
        }
      });
    });
  });

  setTimeout(() => {
    console.log('\n\n========================================');
    console.log('RECOMENDACIÓN:');
    console.log('========================================');
    console.log('Las tablas "purchases" y "ventas" tienen propósitos diferentes:');
    console.log('');
    console.log('• purchases.total_amount = Total PAGADO por el cliente');
    console.log('  (incluye productos + envío + otros cargos)');
    console.log('');
    console.log('• ventas = Registro detallado de PRODUCTOS vendidos');
    console.log('  (solo muestra el precio de productos)');
    console.log('');
    console.log('SOLUCIÓN:');
    console.log('1. "Gestión de pedidos" debe seguir usando purchases.total_amount');
    console.log('   (es el dinero realmente cobrado al cliente)');
    console.log('');
    console.log('2. "Historial de ventas" debe calcular desde purchases.total_amount');
    console.log('   en lugar de ventas, O incluir los cargos adicionales en el cálculo.');
    console.log('');
    console.log('3. Verificar si purchases.total_amount incluye costos de envío.');
    console.log('========================================\n');
    
    db.close();
  }, 2000);
});
