// utils/helpers.js

/**
 * Genera una contraseña aleatoria segura
 * @param {number} length - Longitud de la contraseña
 * @returns {string} - Contraseña generada
 */
const generateRandomPassword = (length = 8) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

/**
 * Formatea un número como moneda chilena
 * @param {number} amount - Monto a formatear
 * @returns {string} - Monto formateado
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formatea un número con separadores de miles
 * @param {number} number - Número a formatear
 * @returns {string} - Número formateado
 */
const formatNumber = (number) => {
  return new Intl.NumberFormat('es-CL').format(number);
};

/**
 * Calcula la edad a partir de una fecha de nacimiento
 * @param {Date|string} birthDate - Fecha de nacimiento
 * @returns {number} - Edad en años
 */
const calculateAge = (birthDate) => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Sanitiza una cadena para prevenir inyecciones
 * @param {string} str - Cadena a sanitizar
 * @returns {string} - Cadena sanitizada
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')
    .trim();
};

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida un número de teléfono chileno
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} - true si es válido
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^(\+56)?9\d{8}$/;
  const cleanPhone = phone.replace(/[\s-]/g, '');
  return phoneRegex.test(cleanPhone);
};

/**
 * Formatea un número de teléfono chileno
 * @param {string} phone - Teléfono a formatear
 * @returns {string} - Teléfono formateado
 */
const formatPhone = (phone) => {
  const cleanPhone = phone.replace(/[\s-]/g, '');
  if (cleanPhone.startsWith('+56')) {
    const number = cleanPhone.substring(3);
    return `+56 ${number.substring(0, 1)} ${number.substring(1, 5)} ${number.substring(5)}`;
  } else if (cleanPhone.startsWith('9')) {
    return `+56 ${cleanPhone.substring(0, 1)} ${cleanPhone.substring(1, 5)} ${cleanPhone.substring(5)}`;
  }
  return phone;
};

/**
 * Genera un código de verificación numérico
 * @param {number} length - Longitud del código
 * @returns {string} - Código generado
 */
const generateVerificationCode = (length = 6) => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
};

/**
 * Pagina un array
 * @param {Array} array - Array a paginar
 * @param {number} page - Número de página (empieza en 1)
 * @param {number} limit - Elementos por página
 * @returns {Object} - Objeto con datos paginados e información
 */
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = array.length;
  const totalPages = Math.ceil(total / limit);
  
  const data = array.slice(startIndex, endIndex);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: endIndex < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Calcula el porcentaje
 * @param {number} value - Valor
 * @param {number} total - Total
 * @param {number} decimals - Decimales a mostrar
 * @returns {number} - Porcentaje
 */
const calculatePercentage = (value, total, decimals = 2) => {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * Formatea una fecha en formato legible
 * @param {Date|string} date - Fecha a formatear
 * @param {boolean} includeTime - Si incluir la hora
 * @returns {string} - Fecha formateada
 */
const formatDate = (date, includeTime = false) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  return new Intl.DateTimeFormat('es-CL', options).format(new Date(date));
};

/**
 * Formatea una fecha relativa (hace X tiempo)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha relativa
 */
const formatRelativeDate = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'hace unos segundos';
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
  return `hace ${Math.floor(diffDays / 365)} año${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
};

/**
 * Genera un slug a partir de un texto
 * @param {string} text - Texto a convertir
 * @returns {string} - Slug generado
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Reemplazar espacios con -
    .replace(/[^\w\-]+/g, '') // Eliminar caracteres no válidos
    .replace(/\-\-+/g, '-')   // Reemplazar múltiples - con uno solo
    .replace(/^-+/, '')       // Eliminar - del inicio
    .replace(/-+$/, '');      // Eliminar - del final
};

/**
 * Capitaliza la primera letra de cada palabra
 * @param {string} str - Cadena a capitalizar
 * @returns {string} - Cadena capitalizada
 */
const capitalizeWords = (str) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Trunca un texto agregando puntos suspensivos
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Espera un tiempo determinado (para testing)
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} - Promesa que se resuelve después del tiempo
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Genera un ID único corto
 * @param {number} length - Longitud del ID
 * @returns {string} - ID generado
 */
const generateShortId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Valida si un objeto está vacío
 * @param {Object} obj - Objeto a validar
 * @returns {boolean} - true si está vacío
 */
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Deep clone de un objeto
 * @param {Object} obj - Objeto a clonar
 * @returns {Object} - Copia del objeto
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Agrupa un array por una propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} key - Propiedad por la cual agrupar
 * @returns {Object} - Objeto agrupado
 */
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
};

module.exports = {
  generateRandomPassword,
  formatCurrency,
  formatNumber,
  calculateAge,
  sanitizeString,
  isValidEmail,
  isValidPhone,
  formatPhone,
  generateVerificationCode,
  paginate,
  calculatePercentage,
  formatDate,
  formatRelativeDate,
  generateSlug,
  capitalizeWords,
  truncateText,
  sleep,
  generateShortId,
  isEmpty,
  deepClone,
  groupBy
};