const { HttpError } = require('../utils/httpErrors');
const codes = new Map([
 ['El carrito está vacío','CART_EMPTY'], ['La cantidad debe ser un entero positivo','INVALID_QUANTITY'],
 ['Cantidad inválida','QUANTITY_OVERFLOW'], ['Producto o cantidad inválidos','INVALID_PRODUCT'],
 ['Producto no disponible','PRODUCT_UNAVAILABLE'], ['Stock insuficiente','INSUFFICIENT_STOCK'],
 ['Precio del producto inválido','INVALID_PRICE'], ['Importe del carrito inválido','INVALID_TOTAL']
]);
class CheckoutError extends HttpError { constructor(message) { super(codes.get(message)); this.name = 'CheckoutError'; } }
async function quote(db,input){if(!Array.isArray(input)||!input.length)throw new CheckoutError('El carrito está vacío');const merged=new Map();for(const item of input){if(!item || typeof item !== 'object')throw new CheckoutError('Producto o cantidad inválidos');if(!Number.isSafeInteger(item.quantity)||item.quantity<=0)throw new CheckoutError('La cantidad debe ser un entero positivo');const quantity=(merged.get(item.product_id)?.quantity||0)+item.quantity;if(!Number.isSafeInteger(quantity))throw new CheckoutError('Cantidad inválida');merged.set(item.product_id,{...item,quantity});}input=[...merged.values()];const items=[];let subtotalCents=0;
 for(const item of input){if(!Number.isSafeInteger(item.product_id)||item.product_id<=0||!Number.isFinite(item.quantity)||item.quantity<=0)throw new CheckoutError('Producto o cantidad inválidos');
 const row=await new Promise((resolve,reject)=>db.get('SELECT p.id,p.name,p.price,s.quantity,s.reserved_quantity FROM products p JOIN stock s ON s.product_id=p.id WHERE p.id=?',[item.product_id],(e,r)=>e?reject(e):resolve(r)));
 if(!row)throw new CheckoutError('Producto no disponible',404);if(item.quantity>row.quantity-row.reserved_quantity)throw new CheckoutError('Stock insuficiente',409);if(!Number.isFinite(row.price)||row.price<0)throw new CheckoutError('Precio del producto inválido');
 const cents=Math.round(row.price*100);subtotalCents+=cents*item.quantity;if(!Number.isSafeInteger(subtotalCents))throw new CheckoutError('Importe del carrito inválido');items.push({...item,price:cents/100,product_name:row.name});}
 const subtotal=subtotalCents/100;const envio=subtotal>50000?0:3000;return {items,subtotal,envio,total:subtotal+envio};}
module.exports={quote,CheckoutError};
