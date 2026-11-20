import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../../services/recovery';
import { validateReset } from '../../utils/recoveryForm';
import './ForgotPassword.css';
export default function ResetPassword(){
  const [token,setToken]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const inFlight=useRef(false);
  async function submit(event){event.preventDefault();if(inFlight.current||message)return;setError('');const invalid=validateReset({token,password,confirmation});if(invalid){setError(invalid);return;}
    inFlight.current=true;setLoading(true);try{const result=await resetPassword(token.trim(),password);if(result.success){setToken('');setPassword('');setConfirmation('');setMessage(result.message);}else setError(result.message);}finally{inFlight.current=false;setLoading(false);}}
  return <div className="forgot-password-page"><section className="forgot-password-container" aria-labelledby="reset-title"><h2 id="reset-title">Restablecer contraseña</h2>
    <p className="forgot-password-subtitle">Pega el token recibido en el transporte ficticio. Vence en 15 minutos y solo puede usarse una vez.</p>
    <form className="forgot-password-form" onSubmit={submit} noValidate aria-busy={loading}><fieldset className="recovery-fields" disabled={loading||Boolean(message)}>
      <div className="form-group"><label htmlFor="reset-token">Token de recuperación</label><input id="reset-token" type="password" autoComplete="off" required value={token} onChange={e=>setToken(e.target.value)} aria-describedby="reset-feedback"/></div>
      <div className="form-group"><label htmlFor="reset-password">Nueva contraseña</label><input id="reset-password" type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} aria-describedby="reset-policy reset-feedback"/></div>
      <p id="reset-policy">Al menos 8 caracteres: mayúscula, minúscula, número y símbolo (@$!%*?&).</p>
      <div className="form-group"><label htmlFor="reset-confirmation">Confirmar contraseña</label><input id="reset-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)} aria-describedby="reset-feedback"/></div>
      <button className="submit-btn" type="submit">{loading?'Restableciendo…':'Guardar nueva contraseña'}</button></fieldset></form>
    <div id="reset-feedback">{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</div><p><Link to="/forgot-password">Solicitar otro token</Link></p><div className="back-to-login"><Link to="/login">Volver al login</Link></div>
  </section></div>;
}
