// scripts/setupProject.js
const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Estructura de directorios
const directories = [
  'config',
  'controllers',
  'middleware',
  'models',
  'routes',
  'services',
  'utils',
  'scripts',
  'logs',
  'docs'
];

// Archivos base que deben existir
const baseFiles = [
  { path: '.env.example', exists: true },
  { path: '.gitignore', exists: true },
  { path: 'package.json', exists: true },
  { path: 'server.js', exists: true },
  { path: 'README.md', exists: false }
];

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`${colors.green}✅ Creado: ${dirPath}${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.yellow}⏭️  Ya existe: ${dirPath}${colors.reset}`);
    return false;
  }
}

function createFile(filePath, content = '') {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`${colors.green}✅ Creado: ${filePath}${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.yellow}⏭️  Ya existe: ${filePath}${colors.reset}`);
    return false;
  }
}

function setupProject() {
  console.log(`\n${colors.bright}${colors.blue}🚀 CONFIGURACIÓN DE PROYECTO - BANCARIZATE${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(50)}${colors.reset}\n`);

  let created = 0;
  let skipped = 0;

  // Crear directorios
  console.log(`${colors.bright}📁 Creando estructura de directorios...${colors.reset}\n`);
  
  directories.forEach(dir => {
    if (createDirectory(dir)) {
      created++;
    } else {
      skipped++;
    }
  });

  // Crear archivos base si no existen
  console.log(`\n${colors.bright}📄 Verificando archivos base...${colors.reset}\n`);

  baseFiles.forEach(file => {
    if (file.exists) {
      if (fs.existsSync(file.path)) {
        console.log(`${colors.green}✅ Encontrado: ${file.path}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Falta: ${file.path}${colors.reset}`);
      }
    }
  });

  // Crear README si no existe
  if (!fs.existsSync('README.md')) {
    const readmeContent = `# BANCARIZATE Backend

Backend para la plataforma bancaria educativa BANCARIZATE.

## Instalación

\`\`\`bash
npm install
cp .env.example .env
# Configurar variables en .env
npm run init-db
npm run dev
\`\`\`

## Scripts disponibles

- \`npm run dev\` - Iniciar en modo desarrollo
- \`npm start\` - Iniciar en modo producción
- \`npm run init-db\` - Inicializar base de datos
- \`npm run seed\` - Poblar con datos de prueba
- \`npm run test-api\` - Probar endpoints
- \`npm run generate-hash\` - Generar hash de contraseña
- \`npm run clean-db\` - Limpiar base de datos

## Documentación

Ver la carpeta \`docs/\` para más información.
`;
    createFile('README.md', readmeContent);
    created++;
  }

  // Crear .gitignore si no existe
  if (!fs.existsSync('.gitignore')) {
    const gitignoreContent = `node_modules/
.env
.env.local
.env.production
logs/
*.log
.DS_Store
.vscode/
.idea/
dist/
build/
coverage/
.nyc_output/
*.swp
*.swo
*~
.npm
.eslintcache
`;
    createFile('.gitignore', gitignoreContent);
    created++;
  }

  // Verificar dependencias
  console.log(`\n${colors.bright}📦 Verificando dependencias...${colors.reset}\n`);

  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'express',
      'cors',
      'helmet',
      'dotenv',
      '@supabase/supabase-js',
      'bcryptjs',
      'jsonwebtoken',
      'express-validator',
      'express-rate-limit',
      'winston',
      'uuid'
    ];

    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);

    if (missingDeps.length > 0) {
      console.log(`${colors.yellow}⚠️  Dependencias faltantes:${colors.reset}`);
      missingDeps.forEach(dep => console.log(`   - ${dep}`));
      console.log(`\n${colors.blue}Instala con: npm install ${missingDeps.join(' ')}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Todas las dependencias requeridas están presentes${colors.reset}`);
    }
  }

  // Resumen
  console.log(`\n${colors.bright}📊 Resumen:${colors.reset}`);
  console.log(`   Creados: ${created}`);
  console.log(`   Omitidos: ${skipped}`);

  // Siguientes pasos
  console.log(`\n${colors.bright}🎯 Siguientes pasos:${colors.reset}`);
  console.log(`1. Configura las variables de entorno en .env`);
  console.log(`2. Crea un proyecto en Supabase`);
  console.log(`3. Ejecuta el schema.sql en Supabase`);
  console.log(`4. Ejecuta: npm run init-db`);
  console.log(`5. Inicia el servidor: npm run dev`);

  console.log(`\n${colors.green}${colors.bright}✨ Estructura del proyecto configurada${colors.reset}\n`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  setupProject();
}

module.exports = setupProject;