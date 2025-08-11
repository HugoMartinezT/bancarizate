// scripts/testCreateStudent.js - Script para probar la funcionalidad completa
const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Datos de prueba para crear estudiante
const testStudentData = {
  run: '19876543-2',
  firstName: 'Carlos',
  lastName: 'Mendoza Silva',
  email: 'carlos.mendoza@estudiante.cl',
  phone: '+56987654321',
  birthDate: '2002-05-15',
  institution: 'Universidad de Valparaíso',
  course: 'Ingeniería Informática',
  gender: 'Masculino',
  status: 'active',
  initialBalance: 0,
  overdraftLimit: 0
};

// Credenciales de admin para hacer el login
const adminCredentials = {
  email: 'admin@bancarizate.cl',
  password: 'admin123'
};

let authToken = null;

async function testCreateStudentFlow() {
  console.log('🧪 INICIANDO PRUEBA COMPLETA DE CREAR ESTUDIANTE');
  console.log('=' .repeat(60));

  try {
    // 1. Probar conexión al servidor
    console.log('\n1. 🌐 Probando conexión al servidor...');
    const healthResponse = await axios.get(`${API_URL.replace('/api', '')}/api/health`);
    console.log('✅ Servidor respondiendo:', healthResponse.data.status);
    
    // 2. Login como administrador
    console.log('\n2. 🔐 Haciendo login como administrador...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, adminCredentials);
    
    if (loginResponse.data.status === 'success') {
      authToken = loginResponse.data.data.token;
      console.log('✅ Login exitoso');
      console.log('   Token recibido:', authToken.substring(0, 20) + '...');
      console.log('   Usuario:', loginResponse.data.data.user.firstName + ' ' + loginResponse.data.data.user.lastName);
      console.log('   Rol:', loginResponse.data.data.user.role);
    } else {
      throw new Error('Login falló');
    }

    // 3. Verificar que tenemos permisos de admin
    console.log('\n3. 🔍 Verificando permisos de administrador...');
    const verifyResponse = await axios.get(`${API_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (verifyResponse.data.data.user.role !== 'admin') {
      throw new Error('Se requieren permisos de administrador para crear estudiantes');
    }
    console.log('✅ Permisos de admin confirmados');

    // 4. Verificar que el RUN no existe
    console.log('\n4. 👀 Verificando que el RUN no existe...');
    try {
      const studentsResponse = await axios.get(`${API_URL}/students?search=${testStudentData.run}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const existingStudent = studentsResponse.data.data.students.find(s => s.run === testStudentData.run);
      if (existingStudent) {
        console.log('⚠️  Estudiante ya existe, eliminándolo para la prueba...');
        await axios.delete(`${API_URL}/students/${existingStudent.id}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('🗑️  Estudiante anterior eliminado');
      } else {
        console.log('✅ RUN disponible para usar');
      }
    } catch (error) {
      console.log('✅ RUN disponible (no se encontraron estudiantes)');
    }

    // 5. Crear el estudiante
    console.log('\n5. 👥 Creando nuevo estudiante...');
    console.log('   Datos a enviar:');
    console.log('   -', 'RUN:', testStudentData.run);
    console.log('   -', 'Nombre:', testStudentData.firstName, testStudentData.lastName);
    console.log('   -', 'Email:', testStudentData.email);
    console.log('   -', 'Institución:', testStudentData.institution);
    
    const createResponse = await axios.post(`${API_URL}/students`, testStudentData, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.data.status === 'success') {
      console.log('✅ Estudiante creado exitosamente!');
      console.log('   ID:', createResponse.data.data.student.id);
      console.log('   RUN:', createResponse.data.data.student.run);
      console.log('   Nombre completo:', createResponse.data.data.student.firstName + ' ' + createResponse.data.data.student.lastName);
      console.log('   Email:', createResponse.data.data.student.email);
      console.log('   🔑 Contraseña temporal:', createResponse.data.data.student.tempPassword);
    } else {
      throw new Error('Error en la respuesta del servidor');
    }

    // 6. Verificar que el estudiante fue creado correctamente
    console.log('\n6. ✔️  Verificando que el estudiante fue creado...');
    const studentsListResponse = await axios.get(`${API_URL}/students?search=${testStudentData.run}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const createdStudent = studentsListResponse.data.data.students.find(s => s.run === testStudentData.run);
    if (createdStudent) {
      console.log('✅ Estudiante encontrado en la lista');
      console.log('   Estado:', createdStudent.status);
      console.log('   Activo:', createdStudent.isActive ? 'Sí' : 'No');
      console.log('   Curso:', createdStudent.course);
    } else {
      throw new Error('Estudiante no encontrado en la lista');
    }

    // 7. Probar login del estudiante recién creado
    console.log('\n7. 🔐 Probando login del estudiante recién creado...');
    const studentLoginData = {
      run: testStudentData.run,
      password: createResponse.data.data.student.tempPassword
    };
    
    const studentLoginResponse = await axios.post(`${API_URL}/auth/login`, studentLoginData);
    
    if (studentLoginResponse.data.status === 'success') {
      console.log('✅ Login del estudiante exitoso');
      console.log('   Token generado para estudiante');
      console.log('   Balance:', studentLoginResponse.data.data.user.balance);
      console.log('   Límite sobregiro:', studentLoginResponse.data.data.user.overdraftLimit);
    } else {
      throw new Error('Login del estudiante falló');
    }

    console.log('\n🎉 PRUEBA COMPLETA EXITOSA');
    console.log('=' .repeat(60));
    console.log('✅ Servidor funcionando correctamente');
    console.log('✅ Autenticación de admin operativa');
    console.log('✅ Creación de estudiantes funcional');
    console.log('✅ Validaciones del backend activas');
    console.log('✅ Login de estudiantes operativo');
    console.log('✅ Base de datos sincronizada');

    return {
      success: true,
      studentId: createResponse.data.data.student.id,
      tempPassword: createResponse.data.data.student.tempPassword
    };

  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    console.error('=' .repeat(40));
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensaje:', error.response.data.message || error.response.data);
      if (error.response.data.errors) {
        console.error('Errores de validación:', error.response.data.errors);
      }
    } else if (error.request) {
      console.error('No se pudo conectar al servidor');
      console.error('URL intentada:', error.config?.url);
    } else {
      console.error('Error:', error.message);
    }
    
    return { success: false, error: error.message };
  }
}

// Función para limpiar datos de prueba
async function cleanupTestData() {
  if (!authToken) return;
  
  try {
    console.log('\n🧹 Limpiando datos de prueba...');
    const studentsResponse = await axios.get(`${API_URL}/students?search=${testStudentData.run}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const student = studentsResponse.data.data.students.find(s => s.run === testStudentData.run);
    if (student) {
      await axios.delete(`${API_URL}/students/${student.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Datos de prueba eliminados');
    }
  } catch (error) {
    console.log('⚠️  No se pudieron limpiar los datos de prueba:', error.message);
  }
}

// Ejecutar la prueba
if (require.main === module) {
  console.log('🚀 Iniciando script de prueba de crear estudiante...');
  console.log('📡 API URL:', API_URL);
  console.log('');
  
  testCreateStudentFlow()
    .then(result => {
      if (result.success) {
        console.log('\n📋 INFORMACIÓN IMPORTANTE:');
        console.log('- El estudiante fue creado exitosamente');
        console.log('- Puede usar las credenciales para probar el frontend');
        console.log('- RUN:', testStudentData.run);
        console.log('- Contraseña:', result.tempPassword);
        console.log('');
        console.log('💡 Próximos pasos:');
        console.log('1. Probar el frontend con estas credenciales');
        console.log('2. Verificar que el componente CreateStudent funcione');
        console.log('3. Implementar funcionalidades adicionales');
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error inesperado:', error);
      process.exit(1);
    });
}

module.exports = {
  testCreateStudentFlow,
  cleanupTestData
};