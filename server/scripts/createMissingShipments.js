const db = require('../src/config/db');
const ShipmentModel = require('../src/models/shipmentModel');

async function createMissingShipments() {
  try {
    console.log('Buscando pedidos sin shipments...');
    
    // Obtener pedidos sin shipments
    const query = `
      SELECT 
        p.id as purchase_id,
        p.user_id,
        p.shipping_address,
        p.shipping_notes,
        u.name as user_name,
        u.phone as user_phone
      FROM purchases p
      LEFT JOIN shipments s ON p.id = s.purchase_id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE s.id IS NULL
    `;
    
    const purchasesWithoutShipments = await db.getAll(query, []);
    
    if (purchasesWithoutShipments.length === 0) {
      console.log('✓ Todos los pedidos tienen shipments');
      process.exit(0);
    }
    
    console.log(`Encontrados ${purchasesWithoutShipments.length} pedidos sin shipments`);
    
    // Crear shipment para cada pedido
    for (const purchase of purchasesWithoutShipments) {
      console.log(`\nCreando shipment para pedido #${purchase.purchase_id}...`);
      
      const shipmentData = {
        shipping_address: purchase.shipping_address || 'Dirección no especificada',
        recipient_name: purchase.user_name || 'Cliente',
        recipient_phone: purchase.user_phone || 'No especificado',
        shipping_notes: purchase.shipping_notes,
        estimated_delivery: null
      };
      
      const shipment = await ShipmentModel.createShipment(purchase.purchase_id, shipmentData);
      console.log(`✓ Shipment creado con tracking: ${shipment.tracking_number}`);
    }
    
    console.log('\n✓ Proceso completado exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createMissingShipments();
