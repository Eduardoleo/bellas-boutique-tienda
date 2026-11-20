const { sendHttpError, HttpError } = require('../utils/httpErrors');
const { withTransaction, queueOperation, rawAccess } = require('../config/sqliteOperations');
const { logError, logEvent } = require('../utils/safeLogger');
const { db } = require('../config/db');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const {validIdentification}=require('../utils/contactValidation');
const fs = require('fs');
const path = require('path');
const ShipmentModel = require('../models/shipmentModel');
const PaymentMethodModel = require('../models/paymentMethodModel');
const { getCostaRicaDate, getCostaRicaDateString, getCostaRicaISOString, addDaysToCostaRicaDate } = require('../utils/dateUtils');

// Generar consecutivo único para factura
const generateConsecutivo = () => {
  const now = getCostaRicaDate();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `50601${year}${month}${day}${random}`;
};

const {coordinator}=require('../services/checkoutIdempotency');
const access=require('../config/sqliteOperations').createDatabaseAccess(db);
const checkout=coordinator(db);
const effectJobs=new Set();

async function createPurchase(tx,req){
 const userId=req.userId,body=req.body;
 if(!validIdentification(body.identificacion,{required:true}))throw new HttpError('INVALID_DATA');
 if(req.sessionId&&!await require('../services/sessionService').current(tx,userId,req.sessionId))throw new HttpError('AUTH_REQUIRED');
 const user=await tx.getOne("SELECT name,email,phone,address FROM users WHERE id=? AND estado='Activo'",[userId]);
 if(!user)throw new HttpError('RESOURCE_NOT_FOUND');
 if(body.useExistingCard)await PaymentMethodModel.requireOwnedPaymentMethod(body.savedCardId,userId,tx);
 const quoted=await require('../services/checkoutQuote').quote(db,body.cartItems);
 const {items,subtotal,envio,total}=quoted;
 const address=body.shipping_address||user.address||'No especificada';
 const inserted=await tx.runQuery('INSERT INTO purchases(user_id,total_amount,payment_method,status,shipping_address,shipping_notes) VALUES(?,?,?,?,?,?)',[userId,total,'Simulación académica','simulated',address,body.shipping_notes||null]);
 const purchaseId=inserted.id,fecha=getCostaRicaISOString();
 for(const item of items){
  await tx.runQuery('INSERT INTO purchase_items(purchase_id,product_id,quantity,price) VALUES(?,?,?,?)',[purchaseId,item.product_id,item.quantity,item.price]);
  const changed=await tx.runQuery('UPDATE stock SET quantity=quantity-? WHERE product_id=? AND quantity-reserved_quantity>=?',[item.quantity,item.product_id,item.quantity]);
  if(changed.changes!==1)throw new HttpError('INSUFFICIENT_STOCK');
  await tx.runQuery('INSERT INTO ventas(purchase_id,product_id,cantidad,precio_unitario,fecha_venta) VALUES(?,?,?,?,?)',[purchaseId,item.product_id,item.quantity,item.price,fecha]);
  await tx.runQuery('INSERT INTO stock_movements(product_id,movement_type,quantity,reason) VALUES(?,?,?,?)',[item.product_id,'sale',-item.quantity,'Venta - Compra #'+purchaseId]);
 }
 const consecutivo=generateConsecutivo();
 const invoice=await tx.runQuery('INSERT INTO invoices(user_id,purchase_id,consecutivo,cliente_nombre,cliente_identificacion,cliente_direccion,cliente_correo,cliente_telefono,monto_sin_iva,monto_con_iva,envio,total,cantidad_productos) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[userId,purchaseId,consecutivo,user.name,body.identificacion,user.address||'No especificada',user.email,user.phone||'No especificado',subtotal/1.13,subtotal,envio,total,items.reduce((sum,item)=>sum+item.quantity,0)]);
 let saveCard=null;
 if(body.savePaymentMethod&&body.cardNumber&&!body.useExistingCard){
  const expiry=typeof body.expiryDate==='string'?body.expiryDate.split('/'):[];
  saveCard={card_type:detectCardType(body.cardNumber),card_last_four:body.cardNumber.replace(/\s/g,'').slice(-4),card_holder_name:body.cardName,expiry_month:expiry[0]??null,expiry_year:expiry[1]??null,is_default:false};
 }
 const metadata={saveCard,items:items.map(i=>({product_id:i.product_id,product_name:i.product_name,quantity:i.quantity,price:i.price}))};
 await tx.runQuery('INSERT INTO checkout_effects(purchase_id,save_method,metadata_json) VALUES(?,?,?)',[purchaseId,saveCard?'pending':'not_required',JSON.stringify(metadata)]);
 await tx.runQuery('DELETE FROM cart WHERE user_id=?',[userId]);
 return{purchaseId,invoiceId:invoice.id,consecutivo};
}
async function setEffect(purchaseId,name,state){
 if(!['save_method','shipment','invoice_files','shipping_email','invoice_email'].includes(name))throw new Error('Invalid effect');
 await access.runQuery('UPDATE checkout_effects SET '+name+'=?,updated_at=CURRENT_TIMESTAMP WHERE purchase_id=?',[state,purchaseId]);
}
async function runEffects(purchaseId){
 const invoice=await access.getOne('SELECT i.*,p.user_id,p.shipping_address FROM invoices i JOIN purchases p ON p.id=i.purchase_id WHERE p.id=?',[purchaseId]);
 const row=await access.getOne('SELECT metadata_json FROM checkout_effects WHERE purchase_id=?',[purchaseId]);
 if(!invoice||!row)throw new Error('Committed effect context unavailable');
 const meta=JSON.parse(row.metadata_json);
 if(meta.saveCard){
  try{await access.withTransaction(async tx=>{await PaymentMethodModel.createPaymentMethod(invoice.user_id,meta.saveCard);await tx.runQuery("UPDATE checkout_effects SET save_method='succeeded' WHERE purchase_id=?",[purchaseId]);});}
  catch(error){logError('payment.method.failure',error);await setEffect(purchaseId,'save_method','failed');}
 }
 let shipment;
 const estimatedDelivery=addDaysToCostaRicaDate(3);
 try{shipment=await access.withTransaction(async tx=>{
  const existing=await tx.getOne('SELECT tracking_number FROM shipments WHERE purchase_id=?',[purchaseId]);
  const created=existing||await ShipmentModel.createShipment(purchaseId,{shipping_address:invoice.shipping_address,recipient_name:invoice.cliente_nombre,recipient_phone:invoice.cliente_telefono,estimated_delivery:estimatedDelivery.toISOString()});
  await tx.runQuery("UPDATE checkout_effects SET shipment='succeeded' WHERE purchase_id=?",[purchaseId]);return created;
 });}catch(error){logError('payment.shipment.failure',error);await setEffect(purchaseId,'shipment','failed');}
 if(shipment){
  await setEffect(purchaseId,'shipping_email','running');
  const mailState=await sendShippingConfirmationEmail(invoice.cliente_correo,{nombre:invoice.cliente_nombre,trackingNumber:shipment.tracking_number,direccion:invoice.shipping_address,estimatedDelivery,purchaseId});
  await setEffect(purchaseId,'shipping_email',mailState);
 }else await setEffect(purchaseId,'shipping_email','failed');
 const data={purchaseId,cliente:{nombre:invoice.cliente_nombre,identificacion:invoice.cliente_identificacion,direccion:invoice.cliente_direccion,correo:invoice.cliente_correo,telefono:invoice.cliente_telefono},items:meta.items,montoSinIva:invoice.monto_sin_iva,montoConIva:invoice.monto_con_iva,envio:invoice.envio,total:invoice.total,cantidadProductos:invoice.cantidad_productos,fecha:getCostaRicaDate(),fechaString:getCostaRicaDateString()};
 let files;
 try{await setEffect(purchaseId,'invoice_files','running');files=await generateInvoiceFiles(invoice.id,invoice.consecutivo,data);await setEffect(purchaseId,'invoice_files','succeeded');}
 catch(error){logError('payment.invoice.failure',error);await setEffect(purchaseId,'invoice_files','failed');}
 if(files){
  await setEffect(purchaseId,'invoice_email','running');
  const mailState=await sendInvoiceEmail(invoice.cliente_correo,invoice.consecutivo,data,files.pdfPath,files.xmlPath);
  await access.withTransaction(async tx=>{if(mailState==='succeeded')await tx.runQuery('UPDATE invoices SET email_sent=1 WHERE id=?',[invoice.id]);await tx.runQuery('UPDATE checkout_effects SET invoice_email=? WHERE purchase_id=?',[mailState,purchaseId]);});
 }else await setEffect(purchaseId,'invoice_email','failed');
}
const processPayment=async(req,res)=>{
 try{
  const result=await checkout.execute({userId:req.userId,key:req.headers?.['idempotency-key'],body:req.body,work:tx=>createPurchase(tx,req)});
  res.setHeader?.('Idempotency-Replayed',String(result.replayed));
  res.json(result.response);
  if(!result.replayed){const job=runEffects(result.response.purchaseId).catch(error=>logError('payment.effects.failure',error));effectJobs.add(job);job.finally(()=>effectJobs.delete(job));}
 }catch(error){return sendHttpError(req,res,error);}
};
const getCheckoutStatus=async(req,res)=>{try{return res.json(await checkout.status(req.userId,req.params.key));}catch(error){return sendHttpError(req,res,error);}};
const waitForEffects=()=>Promise.all([...effectJobs]);

// Generar archivos de factura y enviar correo
const generateInvoiceFiles = async (invoiceId, consecutivo, data) => {
  const invoicesDir = path.join(__dirname, '../invoices');
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
  const pdfPath = path.join(invoicesDir, 'factura_' + consecutivo + '.pdf');
  const xmlPath = path.join(invoicesDir, 'factura_' + consecutivo + '.xml');
  const suffix=require('node:crypto').randomUUID()+'.tmp';
  const stagedPdf=pdfPath+'.'+suffix,stagedXml=xmlPath+'.'+suffix;
  try{
    await generatePDF(stagedPdf,consecutivo,data);
    await generateXML(stagedXml,consecutivo,data);
    await fs.promises.rename(stagedPdf,pdfPath);
    await fs.promises.rename(stagedXml,xmlPath);
    await queueOperation(db,()=>rawAccess(db).runQuery('UPDATE invoices SET pdf_path=?,xml_path=? WHERE id=?',[pdfPath,xmlPath,invoiceId]));
    return{pdfPath,xmlPath};
  }finally{await Promise.all([stagedPdf,stagedXml].map(file=>fs.promises.unlink(file).catch(error=>{if(error.code!=='ENOENT')logError('payment.file.cleanup',error)})));}
};

// Generar PDF
const generatePDF = (pdfPath, consecutivo, data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const currencyFont=path.join(__dirname,'../assets/fonts/NotoSans.ttf');
    const money=(amount,options={})=>'₡'+amount.toLocaleString('es-CR',{...options,maximumFractionDigits:2});
    const moneyText=(text,x,y)=>{doc.font(currencyFont).text(text,x,y,{width:85});doc.font('Helvetica');};
    const stream = fs.createWriteStream(pdfPath);

    stream.once('finish', resolve);
    stream.once('error', error => { doc.destroy(); reject(error); });
    doc.once('error', error => { stream.destroy(); reject(error); });
    doc.pipe(stream);

    // Encabezado - Datos de la empresa
    doc.fontSize(20).font('Helvetica-Bold').text('Bellas Boutique', { align: 'center' });
    doc.fontSize(10).font('Helvetica');
    doc.text('Cédula Jurídica: 3-101-123456', { align: 'center' });
    doc.text('Razón Social: Bellas Boutique S.A.', { align: 'center' });
    doc.text('Dirección: San José, Costa Rica, 100m norte del parque central', { align: 'center' });
    doc.text('Teléfono: 2222-3333', { align: 'center' });
    doc.moveDown();

    // Línea separadora
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Título de factura
    doc.fontSize(16).font('Helvetica-Bold').text('FACTURA ELECTRÓNICA', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Consecutivo: ${consecutivo}`, { align: 'center' });
    doc.fontSize(10).text(`Fecha: ${data.fecha.toLocaleString('es-CR')}`, { align: 'center' });
    doc.moveDown(2);

    // Datos del cliente
    doc.fontSize(12).font('Helvetica-Bold').text('DATOS DEL CLIENTE');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nombre: ${data.cliente.nombre}`);
    doc.text(`Identificación: ${data.cliente.identificacion}`);
    doc.text(`Dirección: ${data.cliente.direccion}`);
    doc.text(`Correo: ${data.cliente.correo}`);
    doc.text(`Teléfono: ${data.cliente.telefono}`);
    doc.moveDown(2);

    // Tabla de productos
    doc.fontSize(12).font('Helvetica-Bold').text('DETALLE DE PRODUCTOS');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 300;
    const priceX = 380;
    const totalX = 480;

    // Encabezados de tabla
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Producto', itemX, tableTop);
    doc.text('Cant.', quantityX, tableTop);
    doc.text('Precio Unit.', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);

    // Items
    doc.font('Helvetica');
    data.items.forEach((item) => {
      const y = doc.y;
      doc.text(item.product_name, itemX, y, { width: 240 });
      doc.text(item.quantity.toString(), quantityX, y);
      moneyText(`₡${item.price.toLocaleString('es-CR')}`, priceX, y);
      moneyText(`₡${(item.price * item.quantity).toLocaleString('es-CR')}`, totalX, y);
      doc.moveDown();
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Totales
    const totalsX = 380;
    doc.fontSize(10);
    doc.text('Monto sin IVA:', totalsX, doc.y);
    moneyText(`₡${data.montoSinIva.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalX, doc.y);
    doc.moveDown(0.5);

    doc.text('IVA (13%):', totalsX, doc.y);
    moneyText(`₡${(data.montoConIva - data.montoSinIva).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalX, doc.y);
    doc.moveDown(0.5);

    doc.text('Subtotal:', totalsX, doc.y);
    moneyText(`₡${data.montoConIva.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalX, doc.y);
    doc.moveDown(0.5);

    doc.text('Envío:', totalsX, doc.y);
    moneyText(data.envio === 0 ? 'GRATIS' : money(data.envio), totalX, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL:', totalsX, doc.y);
    moneyText(`₡${data.total.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalX, doc.y);

    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica');
    doc.text('Cantidad de productos: ' + data.cantidadProductos, 50, doc.y, { width:500, align: 'center' });
    doc.moveDown(2);
    doc.fontSize(8).text('Documento académico simulado; sin validación de Hacienda. Gracias por su compra', 50, doc.y, { width:500, align: 'center' });

    doc.end();


  });
};

// Generar XML
const generateXML = (xmlPath, consecutivo, data) => {
  return new Promise((resolve, reject) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica>
  <Clave>${consecutivo}</Clave>
  <Fecha>${data.fecha.toISOString()}</Fecha>
  
  <Emisor>
    <Nombre>Bellas Boutique S.A.</Nombre>
    <Identificacion>
      <Tipo>02</Tipo>
      <Numero>3101123456</Numero>
    </Identificacion>
    <Telefono>22223333</Telefono>
    <Direccion>San José, Costa Rica, 100m norte del parque central</Direccion>
    <CorreoElectronico>bbfacturacion@bella.boutique.cr</CorreoElectronico>
  </Emisor>
  
  <Receptor>
    <Nombre>${data.cliente.nombre}</Nombre>
    <Identificacion>${data.cliente.identificacion}</Identificacion>
    <Telefono>${data.cliente.telefono}</Telefono>
    <Direccion>${data.cliente.direccion}</Direccion>
    <CorreoElectronico>${data.cliente.correo}</CorreoElectronico>
  </Receptor>
  
  <DetalleServicio>
    ${data.items.map((item, index) => `
    <LineaDetalle>
      <NumeroLinea>${index + 1}</NumeroLinea>
      <Descripcion>${item.product_name}</Descripcion>
      <Cantidad>${item.quantity}</Cantidad>
      <PrecioUnitario>${item.price}</PrecioUnitario>
      <MontoTotal>${item.price * item.quantity}</MontoTotal>
    </LineaDetalle>
    `).join('')}
  </DetalleServicio>
  
  <ResumenFactura>
    <MontoSinImpuesto>${data.montoSinIva.toFixed(2)}</MontoSinImpuesto>
    <MontoImpuesto>${(data.montoConIva - data.montoSinIva).toFixed(2)}</MontoImpuesto>
    <MontoConImpuesto>${data.montoConIva.toFixed(2)}</MontoConImpuesto>
    <Envio>${data.envio.toFixed(2)}</Envio>
    <TotalComprobante>${data.total.toFixed(2)}</TotalComprobante>
    <CantidadProductos>${data.cantidadProductos}</CantidadProductos>
  </ResumenFactura>
</FacturaElectronica>`;

    fs.writeFile(xmlPath, xml, 'utf8', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Enviar correo con factura
const sendInvoiceEmail = async (email, consecutivo, data, pdfPath, xmlPath) => {
  try {
    // Verificar si hay credenciales de correo configuradas
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logEvent('paymentcontroller.activity');
      return 'failed';
    }

    logEvent('paymentcontroller.activity');

    // Configurar transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verificar conexión
    await transporter.verify();
    logEvent('paymentcontroller.activity');

    const fecha = data.fecha.toLocaleDateString('es-CR');
    const hora = data.fecha.toLocaleTimeString('es-CR');

    const fromName = process.env.EMAIL_FROM_NAME || 'Bellas Boutique';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'facturacion@bellasboutique.cr';

    const mailOptions = {
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      replyTo: fromAddress,
      to: email,
      subject: `Factura Electrónica - ${consecutivo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #64D7DB;">Saludos cordiales ${data.cliente.nombre},</h2>
          
          <p>Este correo electrónico fue generado por un sistema automatizado, por favor no responder.</p>
          
          <p>Adjuntamos archivos PDF y XML del comprobante de pago de su compra realizada el día ${fecha} a la hora ${hora}.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Documento:</strong> Factura Electrónica</p>
            <p style="margin: 5px 0;"><strong>Consecutivo:</strong> ${consecutivo}</p>
            ${data.purchaseId ? `<p style="margin: 5px 0;"><strong>Número de Pedido:</strong> #${data.purchaseId}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Monto:</strong> ₡${data.total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${fecha}</p>
          </div>
          
          <p>Cualquier duda contactarse con:</p>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #64D7DB;">
            <p style="margin: 5px 0;"><strong>Bellas Boutique</strong></p>
            <p style="margin: 5px 0;">${fromAddress}</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `factura_${consecutivo}.pdf`,
          path: pdfPath
        },
        {
          filename: `factura_${consecutivo}.xml`,
          path: xmlPath
        }
      ]
    };

    const receipt=await transporter.sendMail(mailOptions);
    logEvent('paymentcontroller.activity');
    if(!Array.isArray(receipt?.accepted))return 'unknown';
    return receipt.accepted.some(address=>typeof address==='string'&&address.toLowerCase()===email.toLowerCase())?'succeeded':'failed';
  } catch (error) {
    logError('paymentcontroller.failure', error);
    return 'unknown';
  }
};

// Detectar tipo de tarjeta
const detectCardType = (cardNumber) => {
  const number = cardNumber.replace(/\s/g, '');
  if (/^4/.test(number)) return 'visa';
  if (/^5[1-5]/.test(number)) return 'mastercard';
  if (/^3[47]/.test(number)) return 'amex';
  return 'other';
};

// Enviar correo de confirmación de envío
const sendShippingConfirmationEmail = async (email, data) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logEvent('paymentcontroller.activity');
      return 'failed';
    }

    logEvent('paymentcontroller.activity');

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const fromName = process.env.EMAIL_FROM_NAME || 'Bellas Boutique';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'envios@bellasboutique.cr';
    const contactPhone = process.env.CONTACT_PHONE || '2222-3333';
    const companyAddress = process.env.COMPANY_ADDRESS || 'San José, Costa Rica';

    const estimatedDate = new Date(data.estimatedDelivery).toLocaleDateString('es-CR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // FRONTEND_URL puede ser una lista para CORS; el primer origen es el público.
    const frontendUrl = require('../config/corsOptions').parseOrigins()[0];
    const trackingUrl = `${frontendUrl}/tracking/${data.trackingNumber}`;

    const mailOptions = {
      from: `"${fromName} - Envíos" <${process.env.EMAIL_USER}>`,
      replyTo: fromAddress,
      to: email,
      subject: `Confirmación de Envío - ${data.trackingNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #64D7DB; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">¡Pedido en Camino!</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Estimado/a ${data.nombre},</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Recibimos el pago y confirmamos el detalle del envío.
            </p>

            <div style="background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #64D7DB;">
              <h3 style="color: #64D7DB; margin-top: 0;">Detalles del Envío</h3>
              ${data.purchaseId ? `<p style="margin: 10px 0;"><strong>Número de Pedido:</strong> <span style="font-size: 16px;">#${data.purchaseId}</span></p>` : ''}
              <p style="margin: 10px 0;"><strong>Número de Seguimiento:</strong> <span style="color: #64D7DB; font-size: 18px;">${data.trackingNumber}</span></p>
              <p style="margin: 10px 0;"><strong>Dirección de Entrega:</strong> ${data.direccion}</p>
              <p style="margin: 10px 0;"><strong>Fecha Estimada de Entrega:</strong> ${estimatedDate}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" style="display: inline-block; background-color: #64D7DB; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Ver Estado del Envío en Tiempo Real
              </a>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Mediante el link anterior podrá ver el estado de su envío en tiempo real y recibir actualizaciones sobre la ubicación de su paquete.
            </p>

            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Consejo:</strong> Guarda este correo para futura referencia y consulta el estado de tu envío en cualquier momento.
              </p>
            </div>
          </div>

          <div style="background-color: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 5px 0; font-size: 16px;"><strong>Equipo de Envíos Bellas Boutique</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">${fromAddress}</p>
            <p style="margin: 5px 0; font-size: 14px;">Teléfono: ${contactPhone}</p>
            <p style="margin: 5px 0; font-size: 14px;">Dirección: ${companyAddress}</p>
          </div>
        </div>
      `
    };

    const receipt=await transporter.sendMail(mailOptions);
    logEvent('paymentcontroller.activity');
    if(!Array.isArray(receipt?.accepted))return 'unknown';
    return receipt.accepted.some(address=>typeof address==='string'&&address.toLowerCase()===email.toLowerCase())?'succeeded':'failed';
  } catch (error) {
    logError('paymentcontroller.failure', error);
    return 'unknown';
  }
};

module.exports={processPayment,getCheckoutStatus,waitForEffects};
