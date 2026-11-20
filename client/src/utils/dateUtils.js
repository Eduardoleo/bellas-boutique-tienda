/**
 * Utilidades para manejo de fechas en zona horaria de Costa Rica (America/Costa_Rica)
 * UTC-6 sin cambio de horario de verano
 */

/**
 * Obtiene la fecha actual de Costa Rica en formato YYYY-MM-DD
 * @returns {string} Fecha en formato ISO (solo fecha)
 */
export function getCostaRicaDateString() {
  const now = new Date();
  
  // Obtener fecha en zona horaria de Costa Rica
  const options = {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA usa formato YYYY-MM-DD
  return formatter.format(now);
}

/**
 * Obtiene la fecha y hora actual de Costa Rica
 * @returns {Date} Objeto Date ajustado a Costa Rica
 */
export function getCostaRicaDate() {
  const now = new Date();
  
  // Obtener string en formato para parsearlo
  const costaRicaString = now.toLocaleString('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parsear y crear Date
  const [datePart, timePart] = costaRicaString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Formatea una fecha para mostrar en Costa Rica
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatCostaRicaDate(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
