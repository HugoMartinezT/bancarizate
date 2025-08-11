#!/bin/bash

echo "🚀 IMPLEMENTANDO CONEXIÓN DE ESTUDIANTES"
echo "========================================"

# Variables
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# Verificar que estamos en el directorio correcto
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
  echo "❌ Error: No se encontraron las carpetas backend y frontend"
  echo "   Ejecuta este script desde la raíz del proyecto"
  exit 1
fi

echo "✅ Directorios encontrados"

# ==========================================
# BACKEND
# ==========================================
echo ""
echo "📁 ACTUALIZANDO BACKEND..."

# Verificar que existen los archivos necesarios
if [ ! -f "$BACKEND_DIR/controllers/studentController.js" ]; then
  echo "❌ Error: No se encuentra studentController.js"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/routes/studentRoutes.js" ]; then
  echo "❌ Error: No se encuentra studentRoutes.js"
  exit 1
fi

echo "✅ Archivos de estudiantes encontrados"

# Backup del server.js actual
cp "$BACKEND_DIR/server.js" "$BACKEND_DIR/server.js.backup"
echo "✅ Backup de server.js creado"

# ==========================================
# FRONTEND
# ==========================================
echo ""
echo "🌐 ACTUALIZANDO FRONTEND..."

# Backup de archivos del frontend
if [ -f "$FRONTEND_DIR/src/services/api.ts" ]; then
  cp "$FRONTEND_DIR/src/services/api.ts" "$FRONTEND_DIR/src/services/api.ts.backup"
  echo "✅ Backup de api.ts creado"
fi

if [ -f "$FRONTEND_DIR/src/components/Students/StudentList.tsx" ]; then
  cp "$FRONTEND_DIR/src/components/Students/StudentList.tsx" "$FRONTEND_DIR/src/components/Students/StudentList.tsx.backup"
  echo "✅ Backup de StudentList.tsx creado"
fi

echo ""
echo "📋 ARCHIVOS PREPARADOS PARA ACTUALIZAR:"
echo "========================================"
echo "Backend:"
echo "  - server.js (agregar import y ruta de estudiantes)"
echo ""
echo "Frontend:"
echo "  - src/services/api.ts (agregar métodos de estudiantes)"
echo "  - src/components/Students/StudentList.tsx (conectar a API real)"
echo ""
echo "🔧 PRÓXIMOS PASOS MANUALES:"
echo "=========================="
echo "1. Actualizar server.js:"
echo "   - Agregar: const studentRoutes = require('./routes/studentRoutes');"
echo "   - Agregar: app.use('/api/students', studentRoutes);"
echo ""
echo "2. Reemplazar src/services/api.ts con la versión que incluye métodos de estudiantes"
echo ""
echo "3. Reemplazar src/components/Students/StudentList.tsx con la versión conectada"
echo ""
echo "4. Reiniciar servicios:"
echo "   cd $BACKEND_DIR && npm run dev"
echo "   cd $FRONTEND_DIR && npm run dev"
echo ""
echo "✅ PREPARACIÓN COMPLETA"
echo "Los backups están guardados con extensión .backup"