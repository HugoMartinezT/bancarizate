// scripts/testApi.js
const axios = require('axios');
const { formatCurrency } = require('../utils/helpers');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TEST_RUN = '18108750-1';
const TEST_PASSWORD = '123';

let authToken = null;
let userId = null;
let userBalance = 0;

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

// Crear cliente axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 5000
});

// Interceptor para agregar token
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Funciones helper
const log = {
  title: (text) => console.log(`\n${colors.bright}${colors.blue}${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.cyan}ℹ️  ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`)
};

// Tests
async function testHealthCheck() {
  log.title('🏥 Testing Health Check...');
  try {
    const response = await api.get('/health');
    log.success(`Health Check OK - Version: ${response.data.version}`);
    log.info(`Environment: ${response.data.environment}`);
    return true;
  } catch (error) {
    log.error(`Health Check failed: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  log.title('🔐 Testing Login...');
  try {
    const response = await api.post('/auth/login', {
      run: TEST_RUN,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.data.token;
    userId = response.data.data.user.id;
    userBalance = response.data.data.user.balance;
    
    log.success('Login successful');
    log.info(`User: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
    log.info(`Balance: ${formatCurrency(userBalance)}`);
    log.info(`Role: ${response.data.data.user.role}`);
    
    return response.data.data.user;
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testInvalidLogin() {
  log.title('🔒 Testing Invalid Login...');
  try {
    await api.post('/auth/login', {
      run: TEST_RUN,
      password: 'wrongpassword'
    });
    log.error('Invalid login should have failed!');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success('Invalid login correctly rejected');
      return true;
    }
    log.error(`Unexpected error: ${error.message}`);
    return false;
  }
}

async function testTokenVerification() {
  log.title('🎫 Testing Token Verification...');
  try {
    const response = await api.get('/auth/verify');
    log.success('Token is valid');
    log.info(`User ID: ${response.data.data.user.id}`);
    return true;
  } catch (error) {
    log.error(`Token verification failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testDashboardStats() {
  log.title('📊 Testing Dashboard Stats...');
  try {
    const response = await api.get('/dashboard/stats');
    const stats = response.data.data.stats;
    
    log.success('Dashboard Stats retrieved');
    log.info(`Balance: ${formatCurrency(stats.balance)}`);
    log.info(`Available: ${formatCurrency(stats.availableBalance)}`);
    log.info(`Sent this month: ${formatCurrency(stats.totalSent)}`);
    log.info(`Received this month: ${formatCurrency(stats.totalReceived)}`);
    
    return true;
  } catch (error) {
    log.error(`Dashboard Stats failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testRecentActivity() {
  log.title('📋 Testing Recent Activity...');
  try {
    const response = await api.get('/dashboard/recent-activity?limit=5');
    const activities = response.data.data.activities;
    
    log.success(`Recent Activity: ${activities.length} activities found`);
    
    activities.forEach((activity, index) => {
      log.info(`${index + 1}. ${activity.type === 'income' ? '⬇️' : '⬆️'} ${formatCurrency(activity.amount)} - ${activity.description}`);
    });
    
    return true;
  } catch (error) {
    log.error(`Recent Activity failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testClassmates() {
  log.title('👥 Testing Get Classmates...');
  try {
    const response = await api.get('/transfers/classmates');
    const classmates = response.data.data.classmates;
    
    log.success(`Classmates: ${classmates.length} found`);
    
    classmates.slice(0, 3).forEach((classmate) => {
      log.info(`- ${classmate.name} (${classmate.run})`);
    });
    
    return classmates;
  } catch (error) {
    log.error(`Get Classmates failed: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

async function testTransfer(classmates) {
  log.title('💸 Testing Transfer...');
  
  if (classmates.length === 0) {
    log.warning('No classmates found, skipping transfer test');
    return false;
  }

  const amount = 10000;
  const recipient = classmates[0];

  try {
    log.info(`Attempting transfer of ${formatCurrency(amount)} to ${recipient.name}`);
    
    const response = await api.post('/transfers', {
      recipientIds: [recipient.id],
      amount: amount,
      description: 'Transferencia de prueba API'
    });
    
    log.success('Transfer successful');
    log.info(`Transfer ID: ${response.data.data.transferId}`);
    log.info(`Amount: ${formatCurrency(response.data.data.amount)}`);
    log.info(`Recipient: ${response.data.data.recipients[0].name}`);
    
    // Actualizar balance local
    userBalance -= amount;
    
    return true;
  } catch (error) {
    log.error(`Transfer failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testTransferValidation() {
  log.title('🚫 Testing Transfer Validation...');
  
  // Test 1: Sin destinatarios
  try {
    await api.post('/transfers', {
      recipientIds: [],
      amount: 10000,
      description: 'Test'
    });
    log.error('Transfer without recipients should have failed!');
  } catch (error) {
    if (error.response?.status === 400) {
      log.success('Empty recipients correctly rejected');
    }
  }

  // Test 2: Monto excesivo
  try {
    await api.post('/transfers', {
      recipientIds: ['some-id'],
      amount: 10000000, // 10 millones
      description: 'Test'
    });
    log.error('Transfer with excessive amount should have failed!');
  } catch (error) {
    if (error.response?.status === 400) {
      log.success('Excessive amount correctly rejected');
    }
  }

  return true;
}

async function testTransferHistory() {
  log.title('📜 Testing Transfer History...');
  try {
    const response = await api.get('/transfers/history?page=1&limit=5');
    const transfers = response.data.data.transfers;
    const pagination = response.data.data.pagination;
    
    log.success(`Transfer History: ${transfers.length} transfers found`);
    log.info(`Total transfers: ${pagination.total}`);
    
    transfers.forEach((transfer) => {
      const icon = transfer.type === 'income' ? '⬇️' : '⬆️';
      const person = transfer.type === 'income' ? transfer.sender : transfer.recipient;
      const personName = person ? `${person.first_name} ${person.last_name}` : 'Desconocido';
      
      log.info(`${icon} ${formatCurrency(transfer.amount)} - ${personName} - ${transfer.description}`);
    });
    
    return true;
  } catch (error) {
    log.error(`Transfer History failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testProfile() {
  log.title('👤 Testing User Profile...');
  try {
    const response = await api.get('/users/profile');
    const profile = response.data.data.profile;
    
    log.success('Profile retrieved successfully');
    log.info(`Name: ${profile.firstName} ${profile.lastName}`);
    log.info(`RUN: ${profile.run}`);
    log.info(`Email: ${profile.email}`);
    log.info(`Phone: ${profile.phone}`);
    log.info(`Current Balance: ${formatCurrency(profile.balance)}`);
    
    return true;
  } catch (error) {
    log.error(`Profile failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testRateLimiting() {
  log.title('⏱️ Testing Rate Limiting...');
  
  // Hacer 6 intentos de login rápidos (límite es 5)
  const promises = [];
  for (let i = 0; i < 6; i++) {
    promises.push(
      api.post('/auth/login', {
        run: TEST_RUN,
        password: 'wrong'
      }).catch(e => e.response)
    );
  }

  const responses = await Promise.all(promises);
  const rateLimited = responses.some(r => r?.status === 429);
  
  if (rateLimited) {
    log.success('Rate limiting is working correctly');
    return true;
  } else {
    log.warning('Rate limiting might not be configured properly');
    return false;
  }
}

async function testLogout() {
  log.title('🚪 Testing Logout...');
  try {
    await api.post('/auth/logout');
    log.success('Logout successful');
    
    // Verificar que el token ya no funciona
    try {
      await api.get('/dashboard/stats');
      log.error('Token should have been invalidated!');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        log.success('Token correctly invalidated after logout');
        return true;
      }
    }
  } catch (error) {
    log.error(`Logout failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Función principal
async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}🧪 BANCARIZATE API Test Suite${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(50)}${colors.reset}\n`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Test User: ${TEST_RUN}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Array de tests a ejecutar
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Invalid Login', fn: testInvalidLogin },
    { name: 'Valid Login', fn: testLogin },
    { name: 'Token Verification', fn: testTokenVerification },
    { name: 'Dashboard Stats', fn: testDashboardStats },
    { name: 'Recent Activity', fn: testRecentActivity },
    { name: 'Profile', fn: testProfile },
    { name: 'Get Classmates', fn: testClassmates },
    { name: 'Transfer Validation', fn: testTransferValidation },
    { name: 'Create Transfer', fn: async () => {
      const classmates = await testClassmates();
      return testTransfer(classmates);
    }},
    { name: 'Transfer History', fn: testTransferHistory },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Logout', fn: testLogout }
  ];

  // Ejecutar tests
  for (const test of tests) {
    results.total++;
    
    // Algunos tests requieren autenticación
    if (['Token Verification', 'Dashboard Stats', 'Recent Activity', 'Profile', 
         'Get Classmates', 'Transfer Validation', 'Create Transfer', 
         'Transfer History', 'Logout'].includes(test.name) && !authToken) {
      log.warning(`Skipping ${test.name} - requires authentication`);
      continue;
    }

    const passed = await test.fn();
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Pequeña pausa entre tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Resumen final
  console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}📊 Test Results Summary${colors.reset}\n`);
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  const rateColor = successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red;
  
  console.log(`${rateColor}Success Rate: ${successRate}%${colors.reset}`);
  
  if (results.passed === results.total) {
    console.log(`\n${colors.green}${colors.bright}✨ All tests passed! The API is working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  Some tests failed. Please check the errors above.${colors.reset}`);
  }

  console.log(`\n${colors.cyan}${'═'.repeat(50)}${colors.reset}\n`);
}

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}${colors.bright}💥 Unhandled Error:${colors.reset}`, error);
  process.exit(1);
});

// Verificar si el servidor está corriendo
api.get('/health')
  .then(() => {
    // Servidor está corriendo, ejecutar tests
    runAllTests().catch(console.error);
  })
  .catch(() => {
    console.error(`\n${colors.red}${colors.bright}❌ Error: Cannot connect to API at ${API_URL}${colors.reset}`);
    console.error(`${colors.yellow}Make sure the server is running with: npm run dev${colors.reset}\n`);
    process.exit(1);
  });