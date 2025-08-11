// scripts/seedDatabase.js
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { generateRandomRUT } = require('../utils/rutValidator');
const { formatPhone } = require('../utils/helpers');

// Datos de estudiantes para seed
const studentsData = [
  {
    run: '20345678-9',
    firstName: 'Sofía',
    lastName: 'Rodríguez Morales',
    email: 'sofia.rodriguez@email.com',
    institution: 'Universidad de Chile',
    course: 'Ingeniería Informática',
    gender: 'Femenino'
  },
  {
    run: '19456789-0',
    firstName: 'Diego',
    lastName: 'Martínez Castro',
    email: 'diego.martinez@email.com',
    institution: 'Universidad de Chile',
    course: 'Ingeniería Informática',
    gender: 'Masculino'
  },
  {
    run: '21567890-1',
    firstName: 'Valentina',
    lastName: 'Silva Pérez',
    email: 'valentina.silva@email.com',
    institution: 'Universidad de Chile',
    course: 'Ingeniería Informática',
    gender: 'Femenino'
  },
  {
    run: '18678901-2',
    firstName: 'Matías',
    lastName: 'López González',
    email: 'matias.lopez@email.com',
    institution: 'Universidad de Chile',
    course: 'Ingeniería Informática',
    gender: 'Masculino'
  },
  {
    run: '20789012-3',
    firstName: 'Isabella',
    lastName: 'García Mendoza',
    email: 'isabella.garcia@email.com',
    institution: 'Universidad de Chile',
    course: 'Ingeniería Informática',
    gender: 'Femenino'
  },
  {
    run: '19890123-4',
    firstName: 'Lucas',
    lastName: 'Fernández Soto',
    email: 'lucas.fernandez@email.com',
    institution: 'Universidad de Chile',
    course: 'Ingeniería Civil',
    gender: 'Masculino'
  },
  {
    run: '21901234-5',
    firstName: 'Camila',
    lastName: 'Torres Vargas',
    email: 'camila.torres@email.com',
    institution: 'Pontificia Universidad Católica',
    course: 'Medicina',
    gender: 'Femenino'
  },
  {
    run: '18012345-6',
    firstName: 'Sebastián',
    lastName: 'Herrera Muñoz',
    email: 'sebastian.herrera@email.com',
    institution: 'Universidad de Santiago',
    course: 'Derecho',
    gender: 'Masculino'
  }
];

// Datos de docentes para seed
const teachersData = [
  {
    run: '10123456-7',
    firstName: 'Roberto',
    lastName: 'Hernández Soto',
    email: 'roberto.hernandez@universidad.cl',
    institution: 'Universidad de Chile',
    courses: ['Cálculo I', 'Álgebra Lineal', 'Ecuaciones Diferenciales'],
    gender: 'Masculino'
  },
  {
    run: '11234567-8',
    firstName: 'Patricia',
    lastName: 'Muñoz Vargas',
    email: 'patricia.munoz@universidad.cl',
    institution: 'Pontificia Universidad Católica',
    courses: ['Anatomía', 'Fisiología'],
    gender: 'Femenino'
  },
  {
    run: '12345678-K',
    firstName: 'Eduardo',
    lastName: 'Silva Morales',
    email: 'eduardo.silva@universidad.cl',
    institution: 'Universidad de Santiago',
    courses: ['Derecho Civil', 'Derecho Penal'],
    gender: 'Masculino'
  }
];

async function seedDatabase() {
  console.log('🌱 Iniciando seed de base de datos BANCARIZATE...\n');

  try {
    let studentsCreated = 0;
    let teachersCreated = 0;
    let transfersCreated = 0;

    // Crear estudiantes
    console.log('👥 Creando estudiantes de prueba...');
    
    for (const student of studentsData) {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('run', student.run)
        .single();

      if (existing) {
        console.log(`⏭️  Estudiante ${student.run} ya existe, saltando...`);
        continue;
      }

      // Generar contraseña (últimos 4 dígitos del RUN)
      const runDigits = student.run.replace(/[^0-9]/g, '');
      const tempPassword = runDigits.slice(-4);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Generar teléfono aleatorio
      const phone = '+569' + Math.floor(10000000 + Math.random() * 90000000);

      // Crear usuario
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          run: student.run,
          password_hash: passwordHash,
          first_name: student.firstName,
          last_name: student.lastName,
          email: student.email,
          phone: phone,
          role: 'student',
          balance: Math.floor(Math.random() * 1000000) + 50000,
          overdraft_limit: 100000,
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        console.error(`❌ Error creando usuario ${student.run}:`, userError.message);
        continue;
      }

      // Crear registro de estudiante
      const birthYear = 2000 + Math.floor(Math.random() * 5);
      const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

      const { error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: newUser.id,
          birth_date: `${birthYear}-${birthMonth}-${birthDay}`,
          institution: student.institution,
          course: student.course,
          gender: student.gender,
          status: 'active'
        });

      if (studentError) {
        console.error(`❌ Error creando estudiante ${student.run}:`, studentError.message);
        continue;
      }

      studentsCreated++;
      console.log(`✅ Creado: ${student.firstName} ${student.lastName} (${student.run}) - Pass: ${tempPassword}`);
    }

    console.log(`\n📊 ${studentsCreated} estudiantes creados\n`);

    // Crear docentes
    console.log('👩‍🏫 Creando docentes de prueba...');

    for (const teacher of teachersData) {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('run', teacher.run)
        .single();

      if (existing) {
        console.log(`⏭️  Docente ${teacher.run} ya existe, saltando...`);
        continue;
      }

      // Generar contraseña
      const tempPassword = 'docente123';
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Generar teléfono
      const phone = '+569' + Math.floor(10000000 + Math.random() * 90000000);

      // Crear usuario
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          run: teacher.run,
          password_hash: passwordHash,
          first_name: teacher.firstName,
          last_name: teacher.lastName,
          email: teacher.email,
          phone: phone,
          role: 'teacher',
          balance: 0,
          overdraft_limit: 0,
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        console.error(`❌ Error creando usuario docente ${teacher.run}:`, userError.message);
        continue;
      }

      // Crear registro de docente
      const birthYear = 1970 + Math.floor(Math.random() * 20);
      const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

      const { error: teacherError } = await supabase
        .from('teachers')
        .insert({
          user_id: newUser.id,
          birth_date: `${birthYear}-${birthMonth}-${birthDay}`,
          institution: teacher.institution,
          courses: teacher.courses,
          gender: teacher.gender,
          status: 'active'
        });

      if (teacherError) {
        console.error(`❌ Error creando docente ${teacher.run}:`, teacherError.message);
        continue;
      }

      teachersCreated++;
      console.log(`✅ Creado: ${teacher.firstName} ${teacher.lastName} (${teacher.run}) - Pass: ${tempPassword}`);
    }

    console.log(`\n📊 ${teachersCreated} docentes creados\n`);

    // Crear algunas transferencias de ejemplo
    console.log('💸 Creando transferencias de ejemplo...');

    // Obtener usuarios para las transferencias
    const { data: users } = await supabase
      .from('users')
      .select('id, run, first_name, last_name, balance')
      .eq('role', 'student')
      .limit(5);

    if (users && users.length > 1) {
      // Crear transferencias entre usuarios
      for (let i = 0; i < Math.min(5, users.length - 1); i++) {
        const sender = users[i];
        const recipient = users[i + 1];
        const amount = Math.floor(Math.random() * 50000) + 10000;

        if (sender.balance >= amount) {
          const { error: transferError } = await supabase
            .from('transfers')
            .insert({
              from_user_id: sender.id,
              to_user_id: recipient.id,
              amount: amount,
              description: `Transferencia de prueba ${i + 1}`,
              status: 'completed',
              type: 'single',
              completed_at: new Date().toISOString()
            });

          if (!transferError) {
            // Actualizar balances
            await supabase
              .from('users')
              .update({ balance: sender.balance - amount })
              .eq('id', sender.id);

            await supabase
              .from('users')
              .update({ balance: recipient.balance + amount })
              .eq('id', recipient.id);

            transfersCreated++;
            console.log(`✅ Transferencia: ${sender.first_name} → ${recipient.first_name} ($${amount.toLocaleString('es-CL')})`);
          }
        }
      }
    }

    console.log(`\n📊 ${transfersCreated} transferencias creadas\n`);

    // Resumen final
    console.log('✨ Seed completado!');
    console.log('\n📊 Resumen:');
    console.log(`   - ${studentsCreated} estudiantes creados`);
    console.log(`   - ${teachersCreated} docentes creados`);
    console.log(`   - ${transfersCreated} transferencias creadas`);
    
    // Mostrar estadísticas finales
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    const { count: totalTeachers } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true });

    const { count: totalTransfers } = await supabase
      .from('transfers')
      .select('*', { count: 'exact', head: true });

    console.log('\n📈 Estado actual de la base de datos:');
    console.log(`   - Total usuarios: ${totalUsers}`);
    console.log(`   - Total estudiantes: ${totalStudents}`);
    console.log(`   - Total docentes: ${totalTeachers}`);
    console.log(`   - Total transferencias: ${totalTransfers}`);

  } catch (error) {
    console.error('\n❌ Error en seed:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;