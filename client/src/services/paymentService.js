import { API_URL } from '../app/config';
import {authenticatedFetch} from '../utils/authHandler';
export async function processPayment(paymentData,key){
 try{const response=await authenticatedFetch(API_URL+'/payments/process',{method:'POST',sensitiveCheckout:true,signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(paymentData)});return{...await response.json(),httpStatus:response.status};}
 catch{return{success:false,message:'Resultado incierto. Reintente la misma compra o consulte su estado.',httpStatus:0};}
}
export async function getCheckoutStatus(key){
 try{const response=await authenticatedFetch(API_URL+'/payments/checkouts/'+encodeURIComponent(key),{sensitiveCheckout:true,signal:AbortSignal.timeout(5000)});return{...await response.json(),httpStatus:response.status};}
 catch{return{success:false,message:'No se pudo confirmar el estado. No inicie otra compra automáticamente.',httpStatus:0};}
}
