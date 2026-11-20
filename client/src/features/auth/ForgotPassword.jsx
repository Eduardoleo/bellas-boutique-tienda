import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestRecovery } from '../../services/recovery';
import { validateRecoveryEmail } from '../../utils/recoveryForm';
import './ForgotPassword.css';
export default function ForgotPassword() {
  const [email,setEmail]=useState(''),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const inFlight=useRef(false);
  async function submit(event){
    event.preventDefault();if(inFlight.current)return;
    setError('');setMessage('');
    if(!validateRecoveryEmail(email)){setError('Introduce un correo válido.');return;}
    inFlight.current=true;setLoading(true);
    try{const result=await requestRecovery(email.trim());if(result.success)setMessage(result.message);else setError(result.message);}
    finally{inFlight.current=false;setLoading(false);}
  }
  return <div className="forgot-password-page"><section className="forgot-password-container" aria-labelledby="recovery-title">
    <h2 id="recovery-title">Recuperar contraseña</h2>
    <p className="forgot-password-subtitle">Solicita un token de un solo uso. No se envía una nueva contraseña. En la demo local, el responsable consulta el buzón ficticio.</p>
    <form className="forgot-password-form" onSubmit={submit} noValidate aria-busy={loading}>
      <fieldset disabled={loading} className="recovery-fields"><div className="form-group"><label htmlFor="recovery-email">Correo electrónico</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} aria-describedby="recovery-feedback"/></div>
      <button className="submit-btn" type="submit">{loading?'Solicitando…':'Solicitar recuperación'}</button></fieldset>
    </form>
    <div id="recovery-feedback">{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</div>
    <p><Link to="/reset-password">Ya tengo un token: restablecer contraseña</Link></p><div className="back-to-login"><Link to="/login">Volver al login</Link></div>
  </section></div>;
}
