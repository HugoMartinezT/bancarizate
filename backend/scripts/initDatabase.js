// scripts/initDatabase.js
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

async function initDatabase() {
  console.log('🚀 Inicializando base de datos BANCARIZATE...\n');

  try {
    // Verificar conexión con Supabase
    console.log('📡 Verificando conexión con Supabase...');
    const { data: testConnection, error: connError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connError && connError.code === '42P01') {
      console.error('❌ Las tablas no existen en Supabase.');
      console.error('   Por favor ejecuta primero el archivo schema.sql en el SQL Editor de Supabase.');
      process.exit(1);
    }

    console.log('✅ Conexión establecida con Supabase\n');

    // Crear usuario de prueba principal
    console.log('👤 Creando usuario de prueba principal...');
    
    // Verificar si ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('run', '18108750-1')
      .single();

    if (existingUser) {
      console.log('⚠️  Usuario de prueba ya existe, saltando creación...\n');
    } else {
      // Generar hash para contraseña '123'
      const hashedPassword = await bcrypt.hash('123', 10);
      
      // Crear usuario
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          run: '18108750-1',
          password_hash: hashedPassword,
          first_name: 'Juan',
          last_name: 'Pérez González',
          email: 'juan.perez@banco.cl',
          phone: '+56912345678',
          role: 'student',
          balance: 1250000,
          overdraft_limit: 500000,
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Error creando usuario de prueba:', userError);
        process.exit(1);
      }

      console.log('✅ Usuario creado: Juan Pérez González (18108750-1)');
      console.log('   Contraseña: 123');
      
      // Crear registro de estudiante
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: newUser.id,
          birth_date: '2000-01-15',
          institution: 'Universidad de Chile',
          course: 'Ingeniería Informática',
          gender: 'Masculino',
          status: 'active'
        });

      if (studentError) {
        console.error('⚠️  Error creando registro de estudiante:', studentError);
      } else {
        console.log('✅ Registro de estudiante creado\n');
      }
    }

    // Crear usuario administrador
    console.log('👤 Creando usuario administrador...');
    
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@bancarizate.cl')
      .single();

    if (existingAdmin) {
      console.log('⚠️  Usuario administrador ya existe, saltando creación...\n');
    } else {
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      const { data: newAdmin, error: adminError } = await supabase
        .from('users')
        .insert({
          run: '11222333-4',
          password_hash: adminPassword,
          first_name: 'Admin',
          last_name: 'Sistema',
          email: 'admin@bancarizate.cl',
          phone: '+56911223344',
          role: 'admin',
          balance: 0,
          overdraft_limit: 0,
          is_active: true
        })
        .select()
        .single();

      if (adminError) {
        console.error('⚠️  Error creando administrador:', adminError);
      } else {
        console.log('✅ Administrador creado: admin@bancarizate.cl');
        console.log('   Contraseña: admin123\n');
      }
    }

    // Verificar estado de las tablas
    console.log('📊 Verificando estado de las tablas...');
    
    const tables = ['users', 'students', 'teachers', 'transfers', 'transfer_recipients', 'activity_logs'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Error en tabla ${table}:`, error.message);
      } else {
        console.log(`✅ Tabla ${table}: ${count || 0} registros`);
      }
    }

    console.log('\n✨ Base de datos inicializada correctamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Usuario estudiante: 18108750-1 / 123');
    console.log('   Usuario admin: admin@bancarizate.cl / admin123');
    
    // Registrar en logs
    logger.info('Base de datos inicializada exitosamente', {
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n❌ Error inicializando base de datos:', error);
    logger.error('Error en inicialización de base de datos', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = initDatabase;