// diagnose.js - Ejecutar con: node diagnose.js
const { supabase } = require('./config/supabase');
require('dotenv').config();

const quickDiagnose = async () => {
  console.log('');
  console.log('🔍 DIAGNÓSTICO RÁPIDO - BANCARIZATE');
  console.log('==================================');
  console.log('');

  try {
    // 1. Verificar variables de entorno
    console.log('1. 📋 Variables de entorno:');
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        console.log(`   ❌ ${varName}: NO CONFIGURADA`);
      } else {
        console.log(`   ✅ ${varName}: ${value.substring(0, 30)}...`);
      }
    });
    console.log('');

    // 2. Probar conexión básica
    console.log('2. 🌐 Conexión a Supabase:');
    
    // Test de conexión simple
    try {
      const { data, error } = await supabase.from('users').select('count(*)').limit(1);
      
      if (error) {
        console.log('   ❌ Error:', error.message);
        console.log('   📝 Código:', error.code);
        
        if (error.code === '42P01') {
          console.log('   🚨 PROBLEMA: La tabla "users" no existe');
        } else if (error.code === '42501') {
          console.log('   🚨 PROBLEMA: Permisos insuficientes (RLS activo)');
        }
      } else {
        console.log('   ✅ Conexión exitosa');
        console.log('   📊 Tabla users existe');
      }
    } catch (err) {
      console.log('   ❌ Error de conexión:', err.message);
    }
    console.log('');

    // 3. Verificar todas las tablas necesarias
    console.log('3. 🗃️ Estado de tablas:');
    const tables = ['users', 'students', 'teachers', 'transfers', 'transfer_recipients', 'activity_logs'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`   ❌ ${table}: NO EXISTE`);
          } else {
            console.log(`   ⚠️  ${table}: Error - ${error.message}`);
          }
        } else {
          console.log(`   ✅ ${table}: Existe (${count || 0} registros)`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: Error - ${err.message}`);
      }
    }
    console.log('');

    // 4. Test de inserción
    console.log('4. ✍️ Test de escritura:');
    try {
      const testUser = {
        run: 'TEST-DIAG-123',
        password_hash: 'test_hash',
        first_name: 'Test',
        last_name: 'Diagnose',
        email: 'test-diagnose@bancarizate.cl',
        role: 'student',
        balance: 0
      };
      
      const { data, error } = await supabase
        .from('users')
        .insert(testUser)
        .select()
        .single();
      
      if (error) {
        console.log('   ❌ Error insertando:', error.message);
        if (error.code === '23505') {
          console.log('   ℹ️  (Usuario de prueba ya existe - esto es normal)');
        }
      } else {
        console.log('   ✅ Inserción exitosa');
        
        // Limpiar registro de prueba
        await supabase.from('users').delete().eq('id', data.id);
        console.log('   🧹 Registro de prueba eliminado');
      }
    } catch (err) {
      console.log('   ❌ Error en test de escritura:', err.message);
    }
    console.log('');

    // 5. Recomendaciones
    console.log('💡 RECOMENDACIONES:');
    console.log('==================');
    console.log('');
    
    console.log('🌐 URL de tu proyecto Supabase:');
    console.log('   https://supabase.com/dashboard/project/tclcejrrwfraclivwkjg');
    console.log('');
    
    console.log('📋 Si faltan tablas, ejecuta este SQL en Supabase SQL Editor:');
    console.log('');
    console.log(`-- Crear tabla users básica
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run VARCHAR(12) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0.00,
  overdraft_limit DECIMAL(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  institution VARCHAR(255) NOT NULL,
  course VARCHAR(255) NOT NULL,
  gender VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

SELECT 'Tablas creadas exitosamente!' as message;`);
    
    console.log('');
    console.log('🚀 Después de crear las tablas:');
    console.log('   1. node diagnose.js (verificar)');
    console.log('   2. npm run init-db (poblar datos)');
    console.log('   3. npm run dev (iniciar servidor)');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR EN DIAGNÓSTICO:');
    console.error('========================');
    console.error(error.message);
    console.error('');
  }
};

quickDiagnose();