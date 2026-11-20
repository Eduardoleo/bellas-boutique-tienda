export const recoveryMessage = 'Si la cuenta existe y el correo está configurado, recibirá instrucciones de recuperación.';
export function validateRecoveryEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
export function validateReset({token,password,confirmation}) {
  if (!/^[a-f0-9]{64}$/.test(token.trim())) return 'El token debe contener 64 caracteres hexadecimales.';
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) return 'Usa al menos 8 caracteres con mayúscula, minúscula, número y símbolo (@$!%*?&).';
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return '';
}
