// scripts/verifyAdminRoutes.js - Script para verificar que adminRoutes funciona

const path = require('path');

async function verifyAdminRoutes() {
  console.log('🔍 VERIFICANDO ADMINROUTES...\n');

  try {
    // 1. Verificar que el archivo existe
    const adminRoutesPath = path.join(__dirname, '../routes/admin/adminRoutes.js');
    const fs = require('fs');
    
    if (!fs.existsSync(adminRoutesPath)) {
      console.log('❌ ERROR: El archivo adminRoutes.js NO EXISTE');
      console.log(`   Ruta esperada: ${adminRoutesPath}`);
      return;
    }
    console.log('✅ Archivo adminRoutes.js existe');

    // 2. Verificar que se puede importar sin errores
    try {
      const adminRoutes = require('../routes/admin/adminRoutes');
      console.log('✅ adminRoutes se puede importar sin errores');
      console.log(`   Tipo: ${typeof adminRoutes}`);
    } catch (error) {
      console.log('❌ ERROR importando adminRoutes:');
      console.log(`   ${error.message}`);
      return;
    }

    // 3. Verificar dependencias
    const requiredModules = [
      '../../middleware/auth',
      '../../middleware/validation', 
      '../../middleware/rateLimiter',
      '../../config/supabase'
    ];

    console.log('\n📦 Verificando dependencias:');
    for (const module of requiredModules) {
      try {
        require(module);
        console.log(`   ✅ ${module}`);
      } catch (error) {
        console.log(`   ❌ ${module} - ${error.message}`);
      }
    }

    // 4. Verificar que las validaciones necesarias existen
    console.log('\n🔧 Verificando validaciones:');
    try {
      const validation = require('../middleware/validation');
      const requiredValidations = [
        'validateInstitution',
        'validateCourse', 
        'validateConfigUpdate',
        'validateAdminPasswordChange'
      ];

      for (const validationName of requiredValidations) {
        if (validation[validationName]) {
          console.log(`   ✅ ${validationName}`);
        } else {
          console.log(`   ❌ ${validationName} - NO EXISTE`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error cargando validaciones: ${error.message}`);
    }

    // 5. Verificar rateLimiter
    console.log('\n🛡️ Verificando rateLimiter:');
    try {
      const rateLimiter = require('../middleware/rateLimiter');
      const requiredFunctions = [
        'refreshRateLimiters',
        'getCurrentConfig',
        'transferLimiter'
      ];

      for (const functionName of requiredFunctions) {
        if (rateLimiter[functionName]) {
          console.log(`   ✅ ${functionName}`);
        } else {
          console.log(`   ❌ ${functionName} - NO EXISTE`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error cargando rateLimiter: ${error.message}`);
    }

    // 6. Test de conexión a base de datos
    console.log('\n🗄️ Verificando conexión a base de datos:');
    try {
      const { supabase } = require('../config/supabase');
      
      // Test simple de conexión
      const { data, error } = await supabase
        .from('system_config')
        .select('count(*)')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Error BD: ${error.message}`);
      } else {
        console.log('   ✅ Conexión a base de datos OK');
      }
    } catch (error) {
      console.log(`   ❌ Error probando BD: ${error.message}`);
    }

    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Verificar que server.js incluye las líneas de integración');
    console.log('   2. Reiniciar el servidor: npm run dev');
    console.log('   3. Probar: http://localhost:5000/api/debug/routes');
    console.log('   4. Probar: http://localhost:5000/api/health');

  } catch (error) {
    console.log('❌ ERROR GENERAL:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Ejecutar verificación
if (require.main === module) {
  verifyAdminRoutes();
}

module.exports = verifyAdminRoutes;