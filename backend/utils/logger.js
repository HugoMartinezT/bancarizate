// testInsert.js - Test rápido de inserción
const { supabase } = require('./config/supabase');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const testInsert = async () => {
  console.log('🧪 TEST DE INSERCIÓN RÁPIDA');
  console.log('===========================');
  console.log('');

  try {
    // Generar hash para contraseña de prueba
    console.log('🔐 Generando hash de contraseña...');
    const hashedPassword = await bcrypt.hash('123', 10);
    console.log('✅ Hash generado');

    // Datos de usuario de prueba
    const testUser = {
      run: '99999999-9',
      password_hash: hashedPassword,
      first_name: 'Test',
      last_name: 'Usuario',
      email: 'test@bancarizate.cl',
      role: 'student',
      balance: 50000,
      is_active: true
    };

    console.log('👤 Insertando usuario de prueba...');
    console.log(`   RUN: ${testUser.run} (${testUser.run.length} caracteres)`);

    // Verificar si ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('run', testUser.run)
      .single();

    if (existingUser) {
      console.log('⚠️  Usuario ya existe, eliminando primero...');
      
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('run', testUser.run);
      
      if (deleteError) {
        console.log('❌ Error eliminando usuario existente:', deleteError.message);
      } else {
        console.log('✅ Usuario existente eliminado');
      }
    }

    // Insertar usuario de prueba
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (insertError) {
      console.log('❌ ERROR DE INSERCIÓN:');
      console.log('   Mensaje:', insertError.message);
      console.log('   Código:', insertError.code);
      console.log('   Detalles:', insertError.details);
      console.log('   Hint:', insertError.hint);
    } else {
      console.log('✅ Usuario insertado exitosamente!');
      console.log('   ID:', newUser.id);
      console.log('   RUN:', newUser.run);
      console.log('   Nombre:', newUser.first_name, newUser.last_name);
      
      // Limpiar - eliminar usuario de prueba
      console.log('🧹 Limpiando usuario de prueba...');
      const { error: cleanupError } = await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id);
      
      if (cleanupError) {
        console.log('⚠️  Error limpiando:', cleanupError.message);
      } else {
        console.log('✅ Usuario de prueba eliminado');
      }
    }

    console.log('');
    console.log('🎯 RESULTADO DEL TEST:');
    
    if (!insertError) {
      console.log('✅ La inserción funciona correctamente');
      console.log('🚀 Puedes ejecutar: npm run init-db');
    } else {
      console.log('❌ Hay problemas con la inserción');
      console.log('🔧 Revisa el error de arriba para solucionarlo');
    }

  } catch (error) {
    console.error('');
    console.error('❌ ERROR INESPERADO:');
    console.error(error.message);
    console.error('');
  }
};

testInsert();