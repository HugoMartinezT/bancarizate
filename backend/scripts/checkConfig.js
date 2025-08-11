// scripts/checkConfig.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Configuración a verificar
const requiredEnvVars = [
  { name: 'NODE_ENV', required: true, default: 'development' },
  { name: 'PORT', required: true, default: '5000' },
  { name: 'SUPABASE_URL', required: true, validator: (val) => val.startsWith('https://') },
  { name: 'SUPABASE_ANON_KEY', required: true, validator: (val) => val.length > 20 },
  { name: 'SUPABASE_SERVICE_KEY', required: true, validator: (val) => val.length > 20 },
  { name: 'JWT_SECRET', required: true, validator: (val) => val.length >= 32 },
  { name: 'JWT_EXPIRE', required: true, default: '7d' },
  { name: 'BCRYPT_ROUNDS', required: true, default: '10', validator: (val) => parseInt(val) >= 10 },
  { name: 'MAX_LOGIN_ATTEMPTS', required: true, default: '5' },
  { name: 'LOCK_TIME', required: true, default: '30' },
  { name: 'API_RATE_LIMIT_WINDOW', required: true, default: '15' },
  { name: 'API_RATE_LIMIT_MAX', required: true, default: '100' }
];

const requiredFiles = [
  '.env',
  'server.js',
  'package.json',
  'config/supabase.js'
];

const requiredDirectories = [
  'config',
  'controllers',
  'middleware',
  'routes',
  'utils',
  'scripts'
];

let errors = 0;
let warnings = 0;

function checkMark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossMark() {
  return `${colors.red}✗${colors.reset}`;
}

function warningMark() {
  return `${colors.yellow}⚠${colors.reset}`;
}

function checkEnvVariables() {
  console.log(`\n${colors.bright}🔐 Verificando variables de entorno${colors.reset}`);
  console.log('─'.repeat(50));

  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar.name];
    
    if (!value && envVar.required) {
      console.log(`${crossMark()} ${envVar.name}: ${colors.red}NO CONFIGURADA${colors.reset}`);
      if (envVar.default) {
        console.log(`   ${colors.yellow}Valor por defecto: ${envVar.default}${colors.reset}`);
      }
      errors++;
    } else if (value && envVar.validator && !envVar.validator(value)) {
      console.log(`${warningMark()} ${envVar.name}: ${colors.yellow}VALOR INVÁLIDO${colors.reset}`);
      warnings++;
    } else if (value) {
      // Ocultar valores sensibles
      let displayValue = value;
      if (['SUPABASE_SERVICE_KEY', 'JWT_SECRET', 'SUPABASE_ANON_KEY'].includes(envVar.name)) {
        displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      }
      console.log(`${checkMark()} ${envVar.name}: ${colors.green}${displayValue}${colors.reset}`);
    }
  });

  // Verificar JWT_SECRET seguridad
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.log(`\n${warningMark()} ${colors.yellow}JWT_SECRET es muy corto. Se recomienda al menos 32 caracteres.${colors.reset}`);
    warnings++;
  }

  // Verificar que las URLs de Supabase coincidan
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('.supabase.co')) {
    console.log(`\n${warningMark()} ${colors.yellow}SUPABASE_URL no parece ser una URL válida de Supabase${colors.reset}`);
    warnings++;
  }
}

function checkFiles() {
  console.log(`\n${colors.bright}📄 Verificando archivos necesarios${colors.reset}`);
  console.log('─'.repeat(50));

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const size = (stats.size / 1024).toFixed(2);
      console.log(`${checkMark()} ${file} ${colors.cyan}(${size} KB)${colors.reset}`);
    } else {
      console.log(`${crossMark()} ${file}: ${colors.red}NO ENCONTRADO${colors.reset}`);
      errors++;
    }
  });
}

function checkDirectories() {
  console.log(`\n${colors.bright}📁 Verificando estructura de directorios${colors.reset}`);
  console.log('─'.repeat(50));

  requiredDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).length;
      console.log(`${checkMark()} ${dir}/ ${colors.cyan}(${files} archivos)${colors.reset}`);
    } else {
      console.log(`${crossMark()} ${dir}/: ${colors.red}NO ENCONTRADO${colors.reset}`);
      errors++;
    }
  });
}

function checkDependencies() {
  console.log(`\n${colors.bright}📦 Verificando dependencias${colors.reset}`);
  console.log('─'.repeat(50));

  if (!fs.existsSync('package.json')) {
    console.log(`${crossMark()} ${colors.red}package.json no encontrado${colors.reset}`);
    errors++;
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const installedDeps = Object.keys(packageJson.dependencies || {});
  
  const requiredDeps = [
    'express',
    '@supabase/supabase-js',
    'bcryptjs',
    'jsonwebtoken',
    'cors',
    'dotenv',
    'express-validator',
    'express-rate-limit',
    'winston'
  ];

  requiredDeps.forEach(dep => {
    if (installedDeps.includes(dep)) {
      const version = packageJson.dependencies[dep];
      console.log(`${checkMark()} ${dep} ${colors.cyan}(${version})${colors.reset}`);
    } else {
      console.log(`${crossMark()} ${dep}: ${colors.red}NO INSTALADO${colors.reset}`);
      errors++;
    }
  });

  // Verificar si node_modules existe
  if (!fs.existsSync('node_modules')) {
    console.log(`\n${warningMark()} ${colors.yellow}node_modules no encontrado. Ejecuta: npm install${colors.reset}`);
    warnings++;
  }
}

async function checkSupabaseConnection() {
  console.log(`\n${colors.bright}🔌 Verificando conexión con Supabase${colors.reset}`);
  console.log('─'.repeat(50));

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log(`${crossMark()} ${colors.red}Credenciales de Supabase no configuradas${colors.reset}`);
    errors++;
    return;
  }

  try {
    const { supabase } = require('../config/supabase');
    
    // Intentar una consulta simple
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log(`${crossMark()} ${colors.red}Las tablas no existen en Supabase${colors.reset}`);
      console.log(`   ${colors.yellow}Ejecuta el archivo schema.sql en Supabase${colors.reset}`);
      errors++;
    } else if (error) {
      console.log(`${crossMark()} ${colors.red}Error de conexión: ${error.message}${colors.reset}`);
      errors++;
    } else {
      console.log(`${checkMark()} ${colors.green}Conexión exitosa con Supabase${colors.reset}`);
      
      // Verificar tablas
      const tables = ['users', 'students', 'teachers', 'transfers', 'activity_logs'];
      for (const table of tables) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (count !== null) {
          console.log(`   ${checkMark()} Tabla ${table}: ${colors.cyan}${count} registros${colors.reset}`);
        }
      }
    }
  } catch (error) {
    console.log(`${crossMark()} ${colors.red}Error al conectar: ${error.message}${colors.reset}`);
    errors++;
  }
}

function checkNodeVersion() {
  console.log(`\n${colors.bright}🟢 Verificando versión de Node.js${colors.reset}`);
  console.log('─'.repeat(50));

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  
  if (majorVersion >= 16) {
    console.log(`${checkMark()} Node.js ${nodeVersion} ${colors.green}(Compatible)${colors.reset}`);
  } else {
    console.log(`${crossMark()} Node.js ${nodeVersion} ${colors.red}(Se requiere v16 o superior)${colors.reset}`);
    errors++;
  }
}

function showSummary() {
  console.log(`\n${colors.bright}📊 RESUMEN DE VERIFICACIÓN${colors.reset}`);
  console.log('═'.repeat(50));

  if (errors === 0 && warnings === 0) {
    console.log(`\n${colors.green}${colors.bright}✨ ¡Todo está configurado correctamente!${colors.reset}`);
    console.log(`${colors.green}El proyecto está listo para ejecutarse.${colors.reset}`);
  } else {
    if (errors > 0) {
      console.log(`\n${colors.red}${colors.bright}❌ Se encontraron ${errors} errores${colors.reset}`);
      console.log(`${colors.red}Estos errores deben corregirse antes de ejecutar el proyecto.${colors.reset}`);
    }
    
    if (warnings > 0) {
      console.log(`\n${colors.yellow}${colors.bright}⚠️  Se encontraron ${warnings} advertencias${colors.reset}`);
      console.log(`${colors.yellow}El proyecto puede funcionar, pero se recomienda revisar estas advertencias.${colors.reset}`);
    }
  }

  console.log(`\n${colors.bright}🚀 Comandos útiles:${colors.reset}`);
  console.log(`   npm install          - Instalar dependencias`);
  console.log(`   npm run init-db      - Inicializar base de datos`);
  console.log(`   npm run dev          - Iniciar servidor en desarrollo`);
  console.log(`   npm run test-api     - Probar los endpoints`);
}

// Función principal
async function runChecks() {
  console.log(`${colors.bright}${colors.blue}🔍 VERIFICACIÓN DE CONFIGURACIÓN - BANCARIZATE${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(50)}${colors.reset}`);

  checkNodeVersion();
  checkEnvVariables();
  checkFiles();
  checkDirectories();
  checkDependencies();
  await checkSupabaseConnection();
  
  showSummary();
}

// Ejecutar verificaciones
runChecks().catch(error => {
  console.error(`\n${colors.red}${colors.bright}💥 Error durante la verificación:${colors.reset}`, error);
  process.exit(1);
});