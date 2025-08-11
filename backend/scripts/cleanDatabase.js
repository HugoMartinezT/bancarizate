// scripts/cleanDatabase.js
const { supabase } = require('../config/supabase');
const readline = require('readline');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Crear interfaz para input del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para preguntar confirmación
const askConfirmation = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

async function cleanDatabase() {
  console.log(`\n${colors.bright}${colors.red}🧹 LIMPIEZA DE BASE DE DATOS${colors.reset}`);
  console.log(`${colors.red}${'═'.repeat(50)}${colors.reset}\n`);
  
  console.log(`${colors.yellow}⚠️  ADVERTENCIA: Esta operación eliminará:${colors.reset}`);
  console.log('   - Todas las transferencias');
  console.log('   - Todos los logs de actividad');
  console.log('   - Todos los usuarios excepto:');
  console.log('     • Usuario de prueba principal (18108750-1)');
  console.log('     • Usuario administrador (admin@bancarizate.cl)');
  console.log(`\n${colors.red}Esta acción NO se puede deshacer.${colors.reset}\n`);

  const confirm = await askConfirmation(`${colors.yellow}¿Estás seguro de que quieres continuar? (y/n): ${colors.reset}`);

  if (!confirm) {
    console.log(`\n${colors.green}✅ Operación cancelada${colors.reset}`);
    rl.close();
    return;
  }

  console.log(`\n${colors.yellow}Por seguridad, escribe "LIMPIAR" para confirmar: ${colors.reset}`);
  
  const finalConfirm = await new Promise((resolve) => {
    rl.question('', (answer) => {
      resolve(answer === 'LIMPIAR');
    });
  });

  if (!finalConfirm) {
    console.log(`\n${colors.green}✅ Operación cancelada${colors.reset}`);
    rl.close();
    return;
  }

  console.log(`\n${colors.blue}🔄 Iniciando limpieza...${colors.reset}\n`);

  try {
    // Obtener IDs de usuarios principales
    const { data: mainUser } = await supabase
      .from('users')
      .select('id')
      .eq('run', '18108750-1')
      .single();

    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@bancarizate.cl')
      .single();

    const protectedUserIds = [mainUser?.id, adminUser?.id].filter(Boolean);

    if (protectedUserIds.length === 0) {
      console.log(`${colors.red}❌ No se encontraron usuarios principales${colors.reset}`);
      rl.close();
      return;
    }

    console.log(`📌 Usuarios protegidos: ${protectedUserIds.length}`);

    // 1. Eliminar todas las transferencias
    console.log('\n🗑️  Eliminando transferencias...');
    const { count: transferCount, error: transferError } = await supabase
      .from('transfers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
      .select('count');

    if (transferError) {
      console.log(`${colors.yellow}⚠️  Error eliminando transferencias: ${transferError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ ${transferCount || 0} transferencias eliminadas${colors.reset}`);
    }

    // 2. Eliminar logs de actividad
    console.log('\n🗑️  Eliminando logs de actividad...');
    const { count: logCount, error: logError } = await supabase
      .from('activity_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
      .select('count');

    if (logError) {
      console.log(`${colors.yellow}⚠️  Error eliminando logs: ${logError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ ${logCount || 0} logs eliminados${colors.reset}`);
    }

    // 3. Obtener usuarios a eliminar
    console.log('\n🔍 Identificando usuarios a eliminar...');
    const { data: usersToDelete, error: selectError } = await supabase
      .from('users')
      .select('id, run, first_name, last_name, role')
      .not('id', 'in', `(${protectedUserIds.join(',')})`);

    if (selectError) {
      console.log(`${colors.red}❌ Error obteniendo usuarios: ${selectError.message}${colors.reset}`);
      rl.close();
      return;
    }

    console.log(`📊 Usuarios a eliminar: ${usersToDelete.length}`);

    // Mostrar lista de usuarios a eliminar
    if (usersToDelete.length > 0) {
      console.log('\nUsuarios que serán eliminados:');
      usersToDelete.forEach(user => {
        console.log(`   - ${user.first_name} ${user.last_name} (${user.run}) - ${user.role}`);
      });

      // 4. Eliminar usuarios (esto eliminará en cascada estudiantes/docentes)
      console.log('\n🗑️  Eliminando usuarios...');
      const userIds = usersToDelete.map(u => u.id);
      
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', userIds);

      if (deleteError) {
        console.log(`${colors.red}❌ Error eliminando usuarios: ${deleteError.message}${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ ${usersToDelete.length} usuarios eliminados${colors.reset}`);
      }
    }

    // 5. Resetear saldos de usuarios principales
    console.log('\n💰 Reseteando saldos de usuarios principales...');
    
    if (mainUser) {
      await supabase
        .from('users')
        .update({ 
          balance: 1250000,
          failed_login_attempts: 0,
          locked_until: null
        })
        .eq('id', mainUser.id);
      console.log(`${colors.green}✅ Saldo de usuario principal reseteado${colors.reset}`);
    }

    // 6. Mostrar estado final
    console.log(`\n${colors.blue}📊 Estado final de la base de datos:${colors.reset}`);
    
    const tables = ['users', 'students', 'teachers', 'transfers', 'transfer_recipients', 'activity_logs'];
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      console.log(`   ${table}: ${count || 0} registros`);
    }

    console.log(`\n${colors.green}${colors.bright}✨ Limpieza completada exitosamente${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error durante la limpieza:${colors.reset}`, error);
  } finally {
    rl.close();
  }
}

// Función para limpiar solo transferencias y logs (menos destructivo)
async function cleanTransactionalData() {
  console.log(`\n${colors.bright}${colors.yellow}🧹 LIMPIEZA DE DATOS TRANSACCIONALES${colors.reset}`);
  console.log(`${colors.yellow}${'═'.repeat(50)}${colors.reset}\n`);
  
  console.log('Esta operación eliminará:');
  console.log('   - Todas las transferencias');
  console.log('   - Todos los logs de actividad');
  console.log(`\n${colors.green}Los usuarios y sus datos básicos se mantendrán.${colors.reset}\n`);

  const confirm = await askConfirmation(`${colors.yellow}¿Continuar? (y/n): ${colors.reset}`);

  if (!confirm) {
    console.log(`\n${colors.green}✅ Operación cancelada${colors.reset}`);
    rl.close();
    return;
  }

  try {
    // Eliminar transferencias
    const { count: transferCount } = await supabase
      .from('transfers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('count');

    console.log(`${colors.green}✅ ${transferCount || 0} transferencias eliminadas${colors.reset}`);

    // Eliminar logs
    const { count: logCount } = await supabase
      .from('activity_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('count');

    console.log(`${colors.green}✅ ${logCount || 0} logs eliminados${colors.reset}`);

    console.log(`\n${colors.green}✨ Limpieza de datos transaccionales completada${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
  } finally {
    rl.close();
  }
}

// Menú principal
async function main() {
  console.log(`\n${colors.bright}${colors.blue}🧹 UTILIDAD DE LIMPIEZA - BANCARIZATE${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(50)}${colors.reset}\n`);
  
  console.log('Selecciona una opción:');
  console.log('1. Limpieza completa (elimina usuarios, transferencias y logs)');
  console.log('2. Limpieza transaccional (solo transferencias y logs)');
  console.log('3. Cancelar\n');

  const option = await new Promise((resolve) => {
    rl.question('Opción (1-3): ', (answer) => {
      resolve(answer);
    });
  });

  switch (option) {
    case '1':
      await cleanDatabase();
      break;
    case '2':
      await cleanTransactionalData();
      break;
    case '3':
      console.log(`\n${colors.green}✅ Operación cancelada${colors.reset}`);
      rl.close();
      break;
    default:
      console.log(`\n${colors.red}❌ Opción inválida${colors.reset}`);
      rl.close();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((error) => {
    console.error(`\n${colors.red}❌ Error fatal:${colors.reset}`, error);
    rl.close();
    process.exit(1);
  });
}

module.exports = { cleanDatabase, cleanTransactionalData };