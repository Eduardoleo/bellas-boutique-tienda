/**
 * Utilidades para manejo de fechas en zona horaria de Costa Rica (America/Costa_Rica)
 * UTC-6 sin cambio de horario de verano
 */

/**
 * Obtiene la fecha y hora actual de Costa Rica
 * @returns {Date} Objeto Date ajustado a Costa Rica
 */
function getCostaRicaDate() {
  // Crear fecha en UTC
  const now = new Date();
  
  // Obtener string en formato ISO para Costa Rica
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
  
  // Parsear el string y crear Date
  const [datePart, timePart] = costaRicaString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Obtiene la fecha actual de Costa Rica en formato YYYY-MM-DD
 * @returns {string} Fecha en formato ISO (solo fecha)
 */
function getCostaRicaDateString() {
  const date = getCostaRicaDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha y hora actual de Costa Rica en formato ISO completo
 * @returns {string} Fecha y hora en formato ISO 8601
 */
function getCostaRicaISOString() {
  const date = getCostaRicaDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * Agrega días a la fecha actual de Costa Rica
 * @param {number} days - Número de días a agregar
 * @returns {Date} Nueva fecha
 */
function addDaysToCostaRicaDate(days) {
  const date = getCostaRicaDate();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Formatea una fecha para mostrar en Costa Rica
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatCostaRicaDate(date) {
  return date.toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

module.exports = {
  getCostaRicaDate,
  getCostaRicaDateString,
  getCostaRicaISOString,
  addDaysToCostaRicaDate,
  formatCostaRicaDate
};
