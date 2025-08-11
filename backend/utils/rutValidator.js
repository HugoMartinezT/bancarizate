// utils/rutValidator.js - Validador de RUT chileno para backend
// Versión para Node.js del validador de RUT

/**
 * Limpia el RUT eliminando puntos, guiones y espacios
 * @param {string} rut - RUT a limpiar
 * @returns {string} RUT limpio
 */
const cleanRUT = (rut) => {
  if (!rut || typeof rut !== 'string') return '';
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
};

/**
 * Formatea un RUT agregando puntos y guión
 * @param {string} rut - RUT a formatear
 * @returns {string} RUT formateado (ej: 12.345.678-9)
 */
const formatRUT = (rut) => {
  const cleanedRUT = cleanRUT(rut);
  if (cleanedRUT.length < 2) return cleanedRUT;

  const body = cleanedRUT.slice(0, -1);
  const dv = cleanedRUT.slice(-1);

  // Agregar puntos cada 3 dígitos desde la derecha
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedBody}-${dv}`;
};

/**
 * Valida si un RUT chileno es válido
 * @param {string} rut - RUT a validar
 * @returns {boolean} True si el RUT es válido
 */
const validateRUT = (rut) => {
  if (!rut || typeof rut !== 'string') return false;

  const cleanedRUT = cleanRUT(rut);
  
  // Verificar longitud mínima y máxima
  if (cleanedRUT.length < 2 || cleanedRUT.length > 9) return false;

  // Separar cuerpo y dígito verificador
  const body = cleanedRUT.slice(0, -1);
  const dv = cleanedRUT.slice(-1);

  // Verificar que el cuerpo solo contenga números
  if (!/^\d+$/.test(body)) return false;

  // Verificar que el dígito verificador sea válido
  if (!/^[0-9K]$/.test(dv)) return false;

  // Calcular dígito verificador
  const calculatedDV = calculateDV(body);
  
  return dv === calculatedDV;
};

/**
 * Calcula el dígito verificador de un RUT
 * @param {string} body - Cuerpo del RUT (sin dígito verificador)
 * @returns {string} Dígito verificador calculado
 */
const calculateDV = (body) => {
  if (!body || typeof body !== 'string') return '';

  let sum = 0;
  let multiplier = 2;

  // Calcular suma ponderada desde la derecha
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const dv = 11 - remainder;

  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
};

/**
 * Formatea un RUT durante la escritura (para inputs)
 * @param {string} value - Valor actual del input
 * @returns {string} RUT formateado para mostrar en input
 */
const formatRUTOnInput = (value) => {
  if (!value) return '';

  // Limpiar el valor
  const cleaned = cleanRUT(value);
  
  // Limitar longitud máxima
  if (cleaned.length > 9) {
    return formatRUTOnInput(cleaned.substring(0, 9));
  }

  // Formatear si tiene suficientes caracteres
  if (cleaned.length >= 2) {
    return formatRUT(cleaned);
  }

  return cleaned;
};

/**
 * Valida si un RUT existe y es válido, con información detallada
 * @param {string} rut - RUT a validar
 * @returns {object} Objeto con información de validación
 */
const validateRUTDetailed = (rut) => {
  const result = {
    isValid: false,
    formatted: '',
    cleaned: '',
    errors: []
  };

  if (!rut || typeof rut !== 'string') {
    result.errors.push('RUT es requerido');
    return result;
  }

  const cleaned = cleanRUT(rut);
  result.cleaned = cleaned;

  if (cleaned.length < 2) {
    result.errors.push('RUT debe tener al menos 2 caracteres');
    return result;
  }

  if (cleaned.length > 9) {
    result.errors.push('RUT no puede tener más de 9 caracteres');
    return result;
  }

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body)) {
    result.errors.push('El cuerpo del RUT debe contener solo números');
    return result;
  }

  if (!/^[0-9K]$/.test(dv)) {
    result.errors.push('Dígito verificador debe ser un número o K');
    return result;
  }

  const calculatedDV = calculateDV(body);
  
  if (dv !== calculatedDV) {
    result.errors.push(`Dígito verificador incorrecto. Debería ser: ${calculatedDV}`);
    return result;
  }

  result.isValid = true;
  result.formatted = formatRUT(cleaned);
  
  return result;
};

/**
 * Genera un RUT válido aleatorio (para testing)
 * @returns {string} RUT válido aleatorio
 */
const generateRandomRUT = () => {
  // Generar cuerpo aleatorio entre 1.000.000 y 99.999.999
  const body = Math.floor(Math.random() * (99999999 - 1000000 + 1)) + 1000000;
  const dv = calculateDV(body.toString());
  
  return formatRUT(body.toString() + dv);
};

/**
 * Extrae información del RUT (para logs o análisis)
 * @param {string} rut - RUT a analizar
 * @returns {object} Información extraída del RUT
 */
const getRUTInfo = (rut) => {
  const validation = validateRUTDetailed(rut);
  
  if (!validation.isValid) {
    return {
      isValid: false,
      errors: validation.errors
    };
  }

  const cleaned = validation.cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  return {
    isValid: true,
    original: rut,
    cleaned: cleaned,
    formatted: validation.formatted,
    body: body,
    dv: dv,
    length: cleaned.length,
    bodyAsNumber: parseInt(body)
  };
};

module.exports = {
  cleanRUT,
  formatRUT,
  validateRUT,
  calculateDV,
  formatRUTOnInput,
  validateRUTDetailed,
  generateRandomRUT,
  getRUTInfo
};