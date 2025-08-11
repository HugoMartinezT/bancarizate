/**
 * Valida un RUT chileno usando el algoritmo módulo 11
 * @param rut - RUT a validar (con o sin puntos y guión)
 * @returns true si el RUT es válido, false en caso contrario
 */
export const validateRUT = (rut: string): boolean => {
  // Eliminar puntos y guión
  const cleanRUT = rut.replace(/\./g, '').replace(/-/g, '');
  
  // Verificar formato básico
  if (!/^\d{7,8}[0-9kK]$/.test(cleanRUT)) {
    return false;
  }
  
  // Separar número y dígito verificador
  const num = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1).toUpperCase();
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = num.length - 1; i >= 0; i--) {
    suma += parseInt(num[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : String(11 - resto);
  
  return dv === dvCalculado;
};

/**
 * Formatea un RUT agregando puntos y guión
 * @param rut - RUT sin formato
 * @returns RUT formateado con puntos y guión
 */
export const formatRUT = (rut: string): string => {
  // Eliminar cualquier caracter que no sea número o K
  const cleanRUT = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  if (cleanRUT.length < 2) return cleanRUT;
  
  // Separar número y dígito verificador
  const num = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1);
  
  // Agregar puntos cada 3 dígitos de derecha a izquierda
  let formattedNum = '';
  for (let i = num.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) {
      formattedNum = '.' + formattedNum;
    }
    formattedNum = num[i] + formattedNum;
  }
  
  return `${formattedNum}-${dv}`;
};

/**
 * Formatea el RUT mientras se escribe
 * @param value - Valor actual del input
 * @returns Valor formateado
 */
export const formatRUTOnInput = (value: string): string => {
  // Eliminar todo excepto números y K
  let cleanValue = value.replace(/[^0-9kK]/gi, '').toUpperCase();
  
  // Limitar a 9 caracteres (8 números + 1 dígito verificador)
  if (cleanValue.length > 9) {
    cleanValue = cleanValue.slice(0, 9);
  }
  
  // Si tiene más de 1 caracter, agregar el guión antes del último
  if (cleanValue.length > 1) {
    const body = cleanValue.slice(0, -1);
    const dv = cleanValue.slice(-1);
    return `${body}-${dv}`;
  }
  
  return cleanValue;
};