const { logEvent } = require('../utils/safeLogger');
const { getOne, getAll, runQuery } = require('../config/db');
const { getCostaRicaDateString, getCostaRicaDate, addDaysToCostaRicaDate } = require('../utils/dateUtils');

class ReportsModel {
  // Generar reporte diario
  static async generateDailyReport(fecha) {
    // Calcular cantidad de productos vendidos
    const ventasQuery = `
      SELECT 
        COUNT(*) as cantidad_productos_vendidos,
        SUM(cantidad) as total_unidades
      FROM ventas
      WHERE DATE(fecha_venta) = ?
    `;
    const ventasData = await getOne(ventasQuery, [fecha]);

    // Calcular ingresos totales
    const ingresosQuery = `
      SELECT SUM(total_amount) as ingresos_totales
      FROM purchases
      WHERE DATE(created_at) = ?
    `;
    const ingresosData = await getOne(ingresosQuery, [fecha]);

    // Obtener productos con stock bajo
    const stockBajoQuery = `
      SELECT 
        p.id,
        p.name,
        s.quantity
      FROM products p
      INNER JOIN stock s ON p.id = s.product_id
      WHERE s.quantity <= s.minimum_stock
    `;
    const productosStockBajo = await getAll(stockBajoQuery);
    const productosStockBajoJson = JSON.stringify(productosStockBajo);

    // Verificar si ya existe el reporte
    const existingReport = await getOne('SELECT * FROM reportes_diarios WHERE fecha = ?', [fecha]);
    
    if (existingReport) {
      // ACTUALIZAR reporte existente con datos frescos
      const updateQuery = `
        UPDATE reportes_diarios 
        SET cantidad_productos_vendidos = ?,
            ingresos_totales = ?,
            productos_stock_bajo = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE fecha = ?
      `;
      await runQuery(updateQuery, [
        ventasData.total_unidades || 0,
        ingresosData.ingresos_totales || 0,
        productosStockBajoJson,
        fecha
      ]);

      return {
        id: existingReport.id,
        fecha,
        cantidad_productos_vendidos: ventasData.total_unidades || 0,
        ingresos_totales: ingresosData.ingresos_totales || 0,
        productos_stock_bajo: productosStockBajo
      };
    }

    // Insertar nuevo reporte
    const insertQuery = `
      INSERT INTO reportes_diarios 
      (fecha, cantidad_productos_vendidos, ingresos_totales, productos_stock_bajo)
      VALUES (?, ?, ?, ?)
    `;
    const result = await runQuery(insertQuery, [
      fecha,
      ventasData.total_unidades || 0,
      ingresosData.ingresos_totales || 0,
      productosStockBajoJson
    ]);

    return {
      id: result.id,
      fecha,
      cantidad_productos_vendidos: ventasData.total_unidades || 0,
      ingresos_totales: ingresosData.ingresos_totales || 0,
      productos_stock_bajo: productosStockBajo
    };
  }

  // Obtener reporte diario
  static async getDailyReport(fecha) {
    const query = 'SELECT * FROM reportes_diarios WHERE fecha = ?';
    const reporte = await getOne(query, [fecha]);
    
    if (reporte && reporte.productos_stock_bajo) {
      reporte.productos_stock_bajo = JSON.parse(reporte.productos_stock_bajo);
    }
    
    return reporte;
  }

  // Obtener reporte mensual
  static async getMonthlyReport(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    // Ventas del mes
    const ventasQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        SUM(cantidad) as total_unidades,
        SUM(cantidad * precio_unitario) as ingresos_totales
      FROM ventas
      WHERE DATE(fecha_venta) BETWEEN ? AND ?
    `;
    const ventas = await getOne(ventasQuery, [startDate, endDate]);

    // Productos más vendidos del mes
    const topProductosQuery = `
      SELECT 
        p.id,
        p.name,
        SUM(v.cantidad) as unidades_vendidas,
        SUM(v.cantidad * v.precio_unitario) as ingresos
      FROM ventas v
      INNER JOIN products p ON v.product_id = p.id
      WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
      GROUP BY v.product_id
      ORDER BY unidades_vendidas DESC
      LIMIT 10
    `;
    const topProductos = await getAll(topProductosQuery, [startDate, endDate]);

    // Ventas por día
    const ventasPorDiaQuery = `
      SELECT 
        DATE(fecha_venta) as fecha,
        COUNT(*) as cantidad_ventas,
        SUM(cantidad) as unidades_vendidas,
        SUM(cantidad * precio_unitario) as ingresos
      FROM ventas
      WHERE DATE(fecha_venta) BETWEEN ? AND ?
      GROUP BY DATE(fecha_venta)
      ORDER BY fecha ASC
    `;
    const ventasPorDia = await getAll(ventasPorDiaQuery, [startDate, endDate]);

    return {
      periodo: `${year}-${String(month).padStart(2, '0')}`,
      resumen: ventas,
      top_productos: topProductos,
      ventas_por_dia: ventasPorDia
    };
  }

  // Obtener productos con stock bajo
  static async getLowStockProducts() {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.gender,
        p.price,
        s.quantity,
        s.minimum_stock,
        s.reserved_quantity,
        (s.quantity - s.reserved_quantity) as disponible
      FROM products p
      INNER JOIN stock s ON p.id = s.product_id
      WHERE s.quantity <= s.minimum_stock
      ORDER BY s.quantity ASC
    `;
    return await getAll(query);
  }

  // Obtener productos más vendidos
  static async getTopSellingProducts(limit = 10, startDate = null, endDate = null) {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.gender,
        p.price,
        SUM(v.cantidad) as unidades_vendidas,
        SUM(v.cantidad * v.precio_unitario) as ingresos_totales,
        COUNT(DISTINCT v.purchase_id) as numero_compras
      FROM ventas v
      INNER JOIN products p ON v.product_id = p.id
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ' WHERE DATE(v.fecha_venta) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ' WHERE DATE(v.fecha_venta) >= ?';
      params.push(startDate);
    } else if (endDate) {
      query += ' WHERE DATE(v.fecha_venta) <= ?';
      params.push(endDate);
    }
    
    query += `
      GROUP BY v.product_id
      ORDER BY unidades_vendidas DESC
      LIMIT ?
    `;
    params.push(limit);
    
    return await getAll(query, params);
  }

  // Obtener estadísticas de ventas
  static async getSalesStats(startDate = null, endDate = null) {
    let ventasQuery = `
      SELECT 
        COUNT(DISTINCT purchase_id) as total_compras,
        COUNT(*) as total_items_vendidos,
        SUM(cantidad) as total_unidades,
        SUM(cantidad * precio_unitario) as ingresos_brutos,
        AVG(precio_unitario) as precio_promedio,
        MIN(fecha_venta) as primera_venta,
        MAX(fecha_venta) as ultima_venta
      FROM ventas
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      ventasQuery += ' WHERE DATE(fecha_venta) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    const stats = await getOne(ventasQuery, params);

    // Ventas por categoría
    let categoriaQuery = `
      SELECT 
        p.category,
        COUNT(*) as cantidad_ventas,
        SUM(v.cantidad) as unidades_vendidas,
        SUM(v.cantidad * v.precio_unitario) as ingresos
      FROM ventas v
      INNER JOIN products p ON v.product_id = p.id
    `;
    
    if (startDate && endDate) {
      categoriaQuery += ' WHERE DATE(v.fecha_venta) BETWEEN ? AND ?';
    }
    
    categoriaQuery += ' GROUP BY p.category ORDER BY ingresos DESC';
    
    const porCategoria = await getAll(categoriaQuery, params);

    // Ventas por género
    let generoQuery = `
      SELECT 
        p.gender,
        COUNT(*) as cantidad_ventas,
        SUM(v.cantidad) as unidades_vendidas,
        SUM(v.cantidad * v.precio_unitario) as ingresos
      FROM ventas v
      INNER JOIN products p ON v.product_id = p.id
    `;
    
    if (startDate && endDate) {
      generoQuery += ' WHERE DATE(v.fecha_venta) BETWEEN ? AND ?';
    }
    
    generoQuery += ' GROUP BY p.gender ORDER BY ingresos DESC';
    
    const porGenero = await getAll(generoQuery, params);

    return {
      resumen: stats,
      por_categoria: porCategoria,
      por_genero: porGenero
    };
  }

  // Obtener bitácora de actividades
  static async getBitacora(filters) {
    const { userId, accion, startDate, endDate, limit } = filters;
    
    let query = `
      SELECT 
        b.*,
        u.name as usuario_nombre,
        u.email as usuario_email,
        u.rol as usuario_rol
      FROM bitacora b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      query += ' AND b.user_id = ?';
      params.push(userId);
    }
    
    if (accion) {
      query += ' AND b.accion = ?';
      params.push(accion);
    }
    
    if (startDate && endDate) {
      query += ' AND DATE(b.fecha) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY b.fecha DESC LIMIT ?';
    params.push(limit || 100);
    
    return await getAll(query, params);
  }

  // Obtener intentos de login
  static async getLoginAttempts(filters) {
    const { email, exitoso, startDate, endDate, limit } = filters;
    
    let query = 'SELECT * FROM intentos_login WHERE 1=1';
    const params = [];
    
    if (email) {
      query += ' AND email LIKE ?';
      params.push(`%${email}%`);
    }
    
    if (exitoso !== undefined) {
      query += ' AND exitoso = ?';
      params.push(exitoso ? 1 : 0);
    }
    
    if (startDate && endDate) {
      query += ' AND DATE(fecha_intento) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY fecha_intento DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    return await getAll(query, params);
  }

  // Obtener dashboard de administrador
  static async getAdminDashboard() {
    // Total de usuarios
    const usersQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN rol = 'Cliente' THEN 1 END) as clientes,
        COUNT(CASE WHEN rol = 'Vendedor' THEN 1 END) as vendedores,
        COUNT(CASE WHEN rol = 'Administrador' THEN 1 END) as administradores,
        COUNT(CASE WHEN estado = 'Activo' THEN 1 END) as activos
      FROM users
    `;
    const usuarios = await getOne(usersQuery);

    // Total de productos
    const productsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN gender = 'mujer' THEN 1 END) as mujer,
        COUNT(CASE WHEN gender = 'hombre' THEN 1 END) as hombre
      FROM products
    `;
    const productos = await getOne(productsQuery);

    // Ventas de hoy
    const today = getCostaRicaDateString();
    const ventasHoyQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        SUM(cantidad) as unidades_vendidas,
        SUM(cantidad * precio_unitario) as ingresos
      FROM ventas
      WHERE DATE(fecha_venta) = ?
    `;
    const ventasHoy = await getOne(ventasHoyQuery, [today]);

    // Ventas del mes
    const now = getCostaRicaDate();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const year = firstDayOfMonth.getFullYear();
    const month = String(firstDayOfMonth.getMonth() + 1).padStart(2, '0');
    const day = String(firstDayOfMonth.getDate()).padStart(2, '0');
    const firstDayString = `${year}-${month}-${day}`;
    const ventasMesQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        SUM(cantidad) as unidades_vendidas,
        SUM(cantidad * precio_unitario) as ingresos
      FROM ventas
      WHERE DATE(fecha_venta) >= ?
    `;
    const ventasMes = await getOne(ventasMesQuery, [firstDayString]);

    // Stock bajo
    const stockBajoQuery = `
      SELECT COUNT(*) as cantidad
      FROM stock
      WHERE quantity <= minimum_stock
    `;
    const stockBajo = await getOne(stockBajoQuery);

    // Últimas compras
    const ultimasComprasQuery = `
      SELECT 
        p.id,
        p.created_at,
        p.total_amount,
        u.name as cliente_nombre,
        u.email as cliente_email,
        COUNT(pi.id) as items
      FROM purchases p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    const ultimasCompras = await getAll(ultimasComprasQuery);

    return {
      usuarios,
      productos,
      ventas_hoy: ventasHoy,
      ventas_mes: ventasMes,
      stock_bajo: stockBajo.cantidad,
      ultimas_compras: ultimasCompras
    };
  }

  // Obtener reporte detallado de ventas
  static async getDetailedSalesReport(startDate = null, endDate = null) {
    let query = `
      SELECT 
        v.id,
        v.fecha_venta,
        v.cantidad,
        v.precio_unitario,
        (v.cantidad * v.precio_unitario) as total,
        p.name as producto_nombre,
        p.category as producto_categoria,
        p.gender as producto_genero,
        pu.id as compra_id,
        u.name as cliente_nombre,
        u.email as cliente_email,
        u.cedula as cliente_cedula
      FROM ventas v
      INNER JOIN products p ON v.product_id = p.id
      INNER JOIN purchases pu ON v.purchase_id = pu.id
      INNER JOIN users u ON pu.user_id = u.id
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ' WHERE DATE(v.fecha_venta) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY v.fecha_venta DESC';
    
    return await getAll(query, params);
  }

  // Convertir datos a CSV
  static convertToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Agregar encabezados
    csvRows.push(headers.join(','));

    // Agregar filas
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escapar comillas y envolver en comillas si contiene comas
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  // Funciones para cron jobs
  static async generarReporteDiario() {
    const fecha = getCostaRicaDateString();
    return await this.generateDailyReport(fecha);
  }

  static async limpiarIntentosLoginAntiguos() {
    const fechaLimite = addDaysToCostaRicaDate(-90); // 3 meses = 90 días
    const year = fechaLimite.getFullYear();
    const month = String(fechaLimite.getMonth() + 1).padStart(2, '0');
    const day = String(fechaLimite.getDate()).padStart(2, '0');
    const fechaLimiteString = `${year}-${month}-${day}`;
    const query = 'DELETE FROM intentos_login WHERE fecha_intento < ?';
    return await runQuery(query, [fechaLimiteString]);
  }

  static async enviarAlertasStockBajo() {
    const productosStockBajo = await this.getProductosStockBajo();
    if (productosStockBajo.length > 0) {
      logEvent('reportsmodel.activity');
      productosStockBajo.forEach(p => {
        logEvent('reportsmodel.activity');
      });
    }
    return productosStockBajo;
  }

  // Obtener todas las ventas
  static async getVentas() {
    const query = `
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
    return await getAll(query);
  }

  // Obtener todos los reportes diarios
  static async getReportesDiarios() {
    const query = 'SELECT * FROM reportes_diarios ORDER BY fecha DESC LIMIT 30';
    return await getAll(query);
  }

  // Obtener todas las compras con información de usuario y estado de envío
  static async getPurchases() {
    const query = `
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.address as user_address,
        COUNT(pi.id) as cantidad_productos,
        s.status as shipping_status,
        s.tracking_number
      FROM purchases p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN shipments s ON p.id = s.purchase_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    return await getAll(query);
  }

  // Obtener detalle de una compra
  static async getPurchaseById(purchaseId) {
    const purchaseQuery = `
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.address as user_address,
        s.status as shipping_status,
        s.tracking_number,
        s.estimated_delivery
      FROM purchases p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN shipments s ON p.id = s.purchase_id
      WHERE p.id = ?
    `;
    const purchase = await getOne(purchaseQuery, [purchaseId]);

    if (purchase) {
      const itemsQuery = `
        SELECT 
          pi.*,
          pr.name as producto_nombre,
          pr.image_url
        FROM purchase_items pi
        LEFT JOIN products pr ON pi.product_id = pr.id
        WHERE pi.purchase_id = ?
      `;
      purchase.items = await getAll(itemsQuery, [purchaseId]);
    }

    return purchase;
  }

  // Actualizar estado de una compra
  static async updatePurchaseStatus(purchaseId, status) {
    const query = 'UPDATE purchases SET status = ? WHERE id = ?';
    return await runQuery(query, [status, purchaseId]);
  }

  // Actualizar estado de envío
  static async updateShipmentStatus(purchaseId, status) {
    const query = 'UPDATE shipments SET status = ? WHERE purchase_id = ?';
    return await runQuery(query, [status, purchaseId]);
  }
}

module.exports = ReportsModel;
