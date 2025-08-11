// scripts/generateHash.js
const bcrypt = require('bcryptjs');

// Obtener argumentos de línea de comandos
const password = process.argv[2];
const rounds = parseInt(process.argv[3]) || 10;

// Validar entrada
if (!password) {
  console.log('\n📝 Generador de Hash de Contraseñas\n');
  console.log('Uso: npm run generate-hash <contraseña> [rounds]');
  console.log('     node scripts/generateHash.js <contraseña> [rounds]\n');
  console.log('Ejemplos:');
  console.log('  npm run generate-hash 123');
  console.log('  npm run generate-hash "mi contraseña segura" 12');
  console.log('  node scripts/generateHash.js admin123 10\n');
  console.log('Parámetros:');
  console.log('  contraseña - La contraseña a hashear (requerido)');
  console.log('  rounds     - Número de rondas bcrypt (opcional, default: 10)\n');
  process.exit(1);
}

console.log('\n🔐 Generando hash de contraseña...\n');
console.log(`Contraseña: ${password}`);
console.log(`Rounds: ${rounds}`);
console.log('');

// Generar hash
bcrypt.hash(password, rounds, (err, hash) => {
  if (err) {
    console.error('❌ Error generando hash:', err);
    process.exit(1);
  }
  
  console.log('✅ Hash generado exitosamente:\n');
  console.log('━'.repeat(80));
  console.log(hash);
  console.log('━'.repeat(80));
  console.log('\n📋 Puedes usar este hash en:');
  console.log('   - El archivo schema.sql para crear usuarios');
  console.log('   - La base de datos directamente');
  console.log('   - Scripts de migración\n');
  
  // Verificar que el hash funciona
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error('❌ Error verificando hash:', err);
    } else if (result) {
      console.log('✅ Verificación: El hash es válido para la contraseña proporcionada');
    } else {
      console.error('❌ Verificación: El hash NO coincide con la contraseña');
    }
    console.log('');
  });
});