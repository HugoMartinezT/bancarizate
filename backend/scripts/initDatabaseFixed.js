// scripts/initDatabaseFixed.js
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');

async function initDatabaseFixed() {
  console.log('🚀 Inicializando base de datos BANCARIZATE...\n');

  try {
    // Verificar conexión con Supabase
    console.log('📡 Verificando conexión con Supabase...');
    const { data: testConnection, error: connError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (connError) {
      console.error('❌ Error de conexión:', connError.message);
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
      try {
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
          console.error('❌ Error creando usuario de prueba:', userError.message);
          console.error('📝 Código de error:', userError.code);
          console.error('💡 Detalles:', userError.details);
        } else {
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
            console.error('⚠️  Error creando registro de estudiante:', studentError.message);
          } else {
            console.log('✅ Registro de estudiante creado\n');
          }
        }
      } catch (err) {
        console.error('❌ Error inesperado creando usuario:', err.message);
      }
    }

    // Crear usuarios adicionales
    console.log('👥 Creando usuarios adicionales...');
    
    const additionalUsers = [
      {
        run: '12345678-9',
        password: '123',
        first_name: 'María',
        last_name: 'González',
        email: 'maria.gonzalez@email.com',
        balance: 50000
      },
      {
        run: '98765432-1', 
        password: '123',
        first_name: 'Pedro',
        last_name: 'Sánchez',
        email: 'pedro.sanchez@email.com',
        balance: 75000
      },
      {
        run: '11111111-1',
        password: '123', 
        first_name: 'Ana',
        last_name: 'López',
        email: 'ana.lopez@email.com',
        balance: 100000
      }
    ];

    for (const userData of additionalUsers) {
      // Verificar si ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('run', userData.run)
        .single();

      if (existingUser) {
        console.log(`⚠️  Usuario ${userData.first_name} ya existe`);
      } else {
        try {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              run: userData.run,
              password_hash: hashedPassword,
              first_name: userData.first_name,
              last_name: userData.last_name,
              email: userData.email,
              role: 'student',
              balance: userData.balance,
              is_active: true
            })
            .select()
            .single();

          if (userError) {
            console.error(`❌ Error creando usuario ${userData.first_name}:`, userError.message);
          } else {
            console.log(`✅ Usuario ${userData.first_name} creado`);
            
            // Crear registro de estudiante
            const { error: studentError } = await supabase
              .from('students')
              .insert({
                user_id: newUser.id,
                birth_date: '2001-01-01',
                institution: 'Universidad de Chile',
                course: 'Ingeniería Informática',
                gender: 'No especificado',
                status: 'active'
              });

            if (studentError) {
              console.error(`⚠️  Error creando estudiante para ${userData.first_name}:`, studentError.message);
            }
          }
        } catch (err) {
          console.error(`❌ Error inesperado con usuario ${userData.first_name}:`, err.message);
        }
      }
    }

    // Crear usuario administrador
    console.log('\n👑 Creando usuario administrador...');
    
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@bancarizate.cl')
      .single();

    if (existingAdmin) {
      console.log('⚠️  Usuario administrador ya existe, saltando creación...\n');
    } else {
      try {
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
          console.error('⚠️  Error creando administrador:', adminError.message);
        } else {
          console.log('✅ Administrador creado: admin@bancarizate.cl');
          console.log('   Contraseña: admin123\n');
        }
      } catch (err) {
        console.error('❌ Error inesperado creando admin:', err.message);
      }
    }

    // Verificar estado final
    console.log('📊 Verificando estado final...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('run, first_name, last_name, role, balance');

    if (usersError) {
      console.log('❌ Error consultando usuarios:', usersError.message);
    } else {
      console.log(`✅ Total de usuarios: ${users.length}`);
      users.forEach(user => {
        console.log(`   📝 ${user.run} - ${user.first_name} ${user.last_name} (${user.role}) - $${user.balance}`);
      });
    }

    console.log('\n✨ Base de datos inicializada correctamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Usuario estudiante: 18108750-1 / 123');
    console.log('   Usuario admin: admin@bancarizate.cl / admin123');
    console.log('\n🚀 Próximo paso: npm run dev');

  } catch (error) {
    console.error('\n❌ Error inicializando base de datos:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initDatabaseFixed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = initDatabaseFixed;