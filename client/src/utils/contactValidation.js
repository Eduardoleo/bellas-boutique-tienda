// Technical bounds for the untyped academic reference; not official identity verification.
function validIdentification(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') return !required;
  if (typeof value !== 'string' || value !== value.trim() || value.length > 20) return false;
  const numeric = /^[0-9]{9,12}$/.test(value);
  const formattedPhysical = /^[0-9]-[0-9]{4}-[0-9]{4}$/.test(value);
  const reference = value.length >= 4 && /^(?=.*[A-Za-z])[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(value);
  return numeric || formattedPhysical || reference;
}

function validPhone(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string' || value.length > 24) return false;
  return /^(?:[0-9]{8}|[0-9]{4}[ -][0-9]{4}|\+[1-9][0-9]{6,14})$/.test(value);
}

export { validIdentification, validPhone };
export const identificationMessage = 'Identificación: 9–12 dígitos, cédula 0-0000-0000 o referencia alfanumérica de 4–20 caracteres (letras, dígitos y guiones).';
export const phoneMessage = 'Teléfono: 8 dígitos locales o + seguido de 7–15 dígitos internacionales.';
