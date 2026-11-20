import { API_URL } from '../app/config';
import { recoveryMessage } from '../utils/recoveryForm';
async function send(route, body) {
  try {
    const response=await fetch(`${API_URL}/auth/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const success=route==='forgot-password'?response.status===202:response.status===200;
    return {success,httpStatus:response.status,message:success?(route==='forgot-password'?recoveryMessage:'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'):(route==='reset-password'&&response.status===400?'Solicitud de recuperación inválida o vencida. Solicita un nuevo token.':'No se pudo completar la solicitud. Intenta de nuevo más tarde.')};
  } catch { return {success:false,httpStatus:0,message:'No se pudo confirmar la solicitud. Comprueba la conexión antes de reintentar.'}; }
}
export const requestRecovery = email => send('forgot-password',{email});
export const resetPassword = (token,password) => send('reset-password',{token,password});
