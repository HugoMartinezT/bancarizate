// controllers/admin/backupController.js
const { supabase } = require('../../config/supabase');

// Función para escapar valores SQL
const escapeSQLValue = (value) => {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  
  if (Array.isArray(value)) {
    return `'{${value.map(item => `"${item}"`).join(',')}}'`;
  }
  
  return value.toString();
};

// Función para generar INSERT statements
const generateInsertStatements = (tableName, data) => {
  if (!data || data.length === 0) {
    return `-- No hay datos en la tabla ${tableName}\n`;
  }

  const columns = Object.keys(data[0]);
  let sql = `-- Datos para la tabla ${tableName}\n`;
  
  // Generar INSERTs en lotes de 100 para mejor rendimiento
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
    
    const values = batch.map(row => {
      const rowValues = columns.map(col => escapeSQLValue(row[col]));
      return `  (${rowValues.join(', ')})`;
    });
    
    sql += values.join(',\n');
    sql += ';\n\n';
  }
  
  return sql;
};

// Crear backup completo
const createFullBackup = async (req, res) => {
  try {
    const { includeData = true, includeLogs = false } = req.query;
    
    console.log('🔄 Iniciando backup completo de la base de datos...');

    // Estructura del backup
    let backupSQL = `-- ===============================================
-- BANCARIZATE - BACKUP COMPLETO
-- ===============================================
-- Fecha de creación: ${new Date().toISOString()}
-- Generado por: ${req.user.first_name} ${req.user.last_name} (${req.user.run})
-- Incluye datos: ${includeData ? 'SÍ' : 'NO'}
-- Incluye logs: ${includeLogs ? 'SÍ' : 'NO'}
-- ===============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eliminar tablas si existen (para restauración limpia)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS transfer_recipients CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;

`;

    // Estructura de tablas (schema)
    backupSQL += `-- ===============================================
-- ESTRUCTURA DE TABLAS
-- ===============================================

-- Tabla users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run VARCHAR(12) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student', 'teacher')),
  balance DECIMAL(12,2) DEFAULT 0.00,
  overdraft_limit DECIMAL(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla institutions
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50),
  address VARCHAR(500),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  level VARCHAR(50),
  duration_months INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  institution VARCHAR(255) NOT NULL,
  course VARCHAR(255) NOT NULL,
  gender VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla teachers
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  institution VARCHAR(255) NOT NULL,
  courses TEXT[],
  gender VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'retired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla transfers
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Tabla transfer_recipients
CREATE TABLE transfer_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID REFERENCES transfers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla system_config
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  data_type VARCHAR(20) DEFAULT 'string',
  category VARCHAR(50) DEFAULT 'general',
  min_value DECIMAL(15,2),
  max_value DECIMAL(15,2),
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Tabla activity_logs
CREATE TABLE activity_logs (
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

-- ===============================================
-- ÍNDICES
-- ===============================================
CREATE INDEX idx_users_run ON users(run);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_institutions_name ON institutions(name);
CREATE INDEX idx_institutions_type ON institutions(type);
CREATE INDEX idx_courses_institution ON courses(institution_id);
CREATE INDEX idx_courses_name ON courses(name);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_transfers_from_user ON transfers(from_user_id);
CREATE INDEX idx_transfers_to_user ON transfers(to_user_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_system_config_key ON system_config(config_key);

-- ===============================================
-- TRIGGERS
-- ===============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

`;

    if (includeData === 'true') {
      backupSQL += `-- ===============================================
-- DATOS DE LAS TABLAS
-- ===============================================

`;

      // Tablas a respaldar en orden de dependencias
      const tablesToBackup = [
        'users',
        'institutions', 
        'courses',
        'students',
        'teachers',
        'system_config',
        'transfers',
        'transfer_recipients'
      ];

      // Incluir activity_logs solo si se solicita
      if (includeLogs === 'true') {
        tablesToBackup.push('activity_logs');
      }

      // Exportar datos de cada tabla
      for (const tableName of tablesToBackup) {
        try {
          console.log(`📦 Exportando tabla: ${tableName}`);
          
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: true });

          if (error) {
            console.error(`❌ Error exportando ${tableName}:`, error);
            backupSQL += `-- Error exportando tabla ${tableName}: ${error.message}\n\n`;
            continue;
          }

          backupSQL += generateInsertStatements(tableName, data);
          
        } catch (error) {
          console.error(`❌ Error con tabla ${tableName}:`, error);
          backupSQL += `-- Error con tabla ${tableName}: ${error.message}\n\n`;
        }
      }
    }

    // Final del backup
    backupSQL += `-- ===============================================
-- FIN DEL BACKUP
-- ===============================================
-- Backup completado: ${new Date().toISOString()}
-- Total de líneas: ${backupSQL.split('\n').length}
-- ===============================================

-- Verificar que todo esté correcto
SELECT 'BACKUP RESTAURADO EXITOSAMENTE' as mensaje;
`;

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'create_backup',
        entity_type: 'backup',
        metadata: { 
          includeData: includeData === 'true',
          includeLogs: includeLogs === 'true',
          backupSize: backupSQL.length,
          timestamp: new Date().toISOString()
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    // Configurar headers para descarga
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `bancarizate_backup_${timestamp}.sql`;
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(backupSQL, 'utf8'));

    console.log(`✅ Backup completado: ${filename} (${(backupSQL.length / 1024).toFixed(2)} KB)`);

    res.status(200).send(backupSQL);

  } catch (error) {
    console.error('❌ Error creando backup completo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear backup completo'
    });
  }
};

// Crear backup de tabla específica
const createTableBackup = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { includeData = true } = req.query;

    // Validar tabla permitida
    const allowedTables = [
      'users', 'students', 'teachers', 'transfers', 
      'transfer_recipients', 'activity_logs', 'institutions', 
      'courses', 'system_config'
    ];

    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tabla no válida para backup'
      });
    }

    console.log(`🔄 Creando backup de tabla: ${tableName}`);

    let backupSQL = `-- ===============================================
-- BANCARIZATE - BACKUP DE TABLA: ${tableName.toUpperCase()}
-- ===============================================
-- Fecha de creación: ${new Date().toISOString()}
-- Generado por: ${req.user.first_name} ${req.user.last_name} (${req.user.run})
-- Incluye datos: ${includeData ? 'SÍ' : 'NO'}
-- ===============================================

`;

    if (includeData === 'true') {
      // Obtener datos de la tabla
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      backupSQL += generateInsertStatements(tableName, data);
    } else {
      backupSQL += `-- Solo estructura solicitada, no se incluyen datos\n\n`;
    }

    backupSQL += `-- ===============================================
-- FIN DEL BACKUP DE TABLA
-- ===============================================
-- Tabla: ${tableName}
-- Registros exportados: ${includeData === 'true' ? 'Incluidos' : 'No incluidos'}
-- Completado: ${new Date().toISOString()}
-- ===============================================
`;

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'create_table_backup',
        entity_type: 'backup',
        metadata: { 
          tableName,
          includeData: includeData === 'true',
          backupSize: backupSQL.length
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    // Configurar headers para descarga
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `bancarizate_${tableName}_backup_${timestamp}.sql`;
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    console.log(`✅ Backup de ${tableName} completado: ${filename}`);

    res.status(200).send(backupSQL);

  } catch (error) {
    console.error(`❌ Error creando backup de tabla ${req.params.tableName}:`, error);
    res.status(500).json({
      status: 'error',
      message: `Error al crear backup de la tabla ${req.params.tableName}`
    });
  }
};

// Obtener estadísticas de backup
const getBackupStats = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de backup...');

    const stats = {};

    // Estadísticas de cada tabla
    const tables = [
      'users', 'students', 'teachers', 'transfers', 
      'transfer_recipients', 'activity_logs', 'institutions',
      'courses', 'system_config'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          stats[table] = { count: 0, error: error.message };
        } else {
          stats[table] = { count: count || 0 };
        }
      } catch (error) {
        stats[table] = { count: 0, error: error.message };
      }
    }

    // Calcular tamaño estimado del backup
    const totalRecords = Object.values(stats).reduce((sum, table) => {
      return sum + (table.count || 0);
    }, 0);

    // Estimar tamaño en KB (aproximadamente 1KB por registro)
    const estimatedSizeKB = totalRecords * 1;

    // Historial de backups recientes
    const { data: recentBackups } = await supabase
      .from('activity_logs')
      .select('*')
      .in('action', ['create_backup', 'create_table_backup'])
      .order('created_at', { ascending: false })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        tableStats: stats,
        summary: {
          totalTables: tables.length,
          totalRecords,
          estimatedSizeKB,
          estimatedSizeMB: (estimatedSizeKB / 1024).toFixed(2)
        },
        recentBackups: recentBackups || []
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de backup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas de backup'
    });
  }
};

// Obtener historial de backups
const getBackupHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: backups, error, count } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users!inner(
          run,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .in('action', ['create_backup', 'create_table_backup'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: {
        backups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial de backups:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener historial de backups'
    });
  }
};

// Validar archivo de backup
const validateBackupFile = async (req, res) => {
  try {
    const { sqlContent } = req.body;

    if (!sqlContent || typeof sqlContent !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Contenido SQL es requerido'
      });
    }

    // Validaciones básicas
    const validations = {
      hasCreateTable: /CREATE TABLE/i.test(sqlContent),
      hasInsertStatements: /INSERT INTO/i.test(sqlContent),
      hasBancarizateSignature: /BANCARIZATE/i.test(sqlContent),
      hasValidTables: /users|students|teachers/i.test(sqlContent),
      fileSize: sqlContent.length,
      estimatedLines: sqlContent.split('\n').length
    };

    const warnings = [];
    const errors = [];

    // Verificar estructura mínima
    if (!validations.hasCreateTable) {
      errors.push('El archivo no contiene declaraciones CREATE TABLE');
    }

    if (!validations.hasBancarizateSignature) {
      warnings.push('El archivo no parece ser un backup de BANCARIZATE');
    }

    if (!validations.hasValidTables) {
      errors.push('El archivo no contiene tablas válidas de BANCARIZATE');
    }

    // Verificar tamaño
    if (validations.fileSize > 50 * 1024 * 1024) { // 50MB
      warnings.push('El archivo es muy grande (>50MB)');
    }

    const isValid = errors.length === 0;

    res.status(200).json({
      status: 'success',
      data: {
        isValid,
        validations,
        warnings,
        errors,
        recommendation: isValid 
          ? 'El archivo parece ser un backup válido de BANCARIZATE'
          : 'El archivo no es un backup válido o está corrupto'
      }
    });

  } catch (error) {
    console.error('❌ Error validando archivo de backup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al validar archivo de backup'
    });
  }
};

// Obtener vista previa de tabla (estructura y datos de muestra)
const getTablePreview = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 10 } = req.query;

    // Validar tabla permitida
    const allowedTables = [
      'users', 'students', 'teachers', 'transfers', 
      'transfer_recipients', 'activity_logs', 'institutions', 
      'courses', 'system_config'
    ];

    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tabla no válida para vista previa'
      });
    }

    console.log(`👁️ Generando vista previa de tabla: ${tableName}`);

    // Obtener información de estructura (simulada - en Supabase es más complejo)
    const columnStructure = {
      users: [
        { name: 'id', type: 'UUID', nullable: false, defaultValue: 'uuid_generate_v4()' },
        { name: 'run', type: 'VARCHAR(12)', nullable: false },
        { name: 'first_name', type: 'VARCHAR(100)', nullable: false },
        { name: 'last_name', type: 'VARCHAR(100)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'balance', type: 'DECIMAL(12,2)', nullable: true, defaultValue: '0.00' },
        { name: 'role', type: 'VARCHAR(20)', nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', nullable: true, defaultValue: 'NOW()' }
      ],
      students: [
        { name: 'id', type: 'UUID', nullable: false, defaultValue: 'uuid_generate_v4()' },
        { name: 'user_id', type: 'UUID', nullable: false },
        { name: 'birth_date', type: 'DATE', nullable: false },
        { name: 'institution', type: 'VARCHAR(255)', nullable: false },
        { name: 'course', type: 'VARCHAR(255)', nullable: false },
        { name: 'status', type: 'VARCHAR(20)', nullable: true, defaultValue: 'active' }
      ],
      teachers: [
        { name: 'id', type: 'UUID', nullable: false, defaultValue: 'uuid_generate_v4()' },
        { name: 'user_id', type: 'UUID', nullable: false },
        { name: 'birth_date', type: 'DATE', nullable: false },
        { name: 'institution', type: 'VARCHAR(255)', nullable: false },
        { name: 'courses', type: 'TEXT[]', nullable: true },
        { name: 'status', type: 'VARCHAR(20)', nullable: true, defaultValue: 'active' }
      ],
      // Agregar más tablas según necesites...
    };

    // Obtener datos de muestra
    const { data: sampleData, error: dataError, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (dataError) {
      throw dataError;
    }

    // Calcular tamaño estimado (aproximado)
    const estimatedSizeKB = (count || 0) * 1; // 1KB por registro estimado
    const estimatedSize = estimatedSizeKB < 1024 
      ? `${estimatedSizeKB.toFixed(0)} KB`
      : `${(estimatedSizeKB / 1024).toFixed(1)} MB`;

    // Obtener fecha de última actualización
    const { data: lastUpdated } = await supabase
      .from(tableName)
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const response = {
      tableName,
      structure: {
        columns: columnStructure[tableName] || [],
        indexes: [`idx_${tableName}_id`, `idx_${tableName}_created_at`],
        constraints: ['PRIMARY KEY', 'FOREIGN KEY', 'CHECK']
      },
      data: {
        sampleRows: sampleData || [],
        totalRows: count || 0,
        estimatedSize
      },
      metadata: {
        lastUpdated: lastUpdated?.updated_at,
        createdAt: sampleData?.[0]?.created_at
      }
    };

    res.status(200).json({
      status: 'success',
      data: response
    });

  } catch (error) {
    console.error(`❌ Error obteniendo vista previa de ${req.params.tableName}:`, error);
    res.status(500).json({
      status: 'error',
      message: `Error al obtener vista previa de la tabla ${req.params.tableName}`
    });
  }
};

module.exports = {
  createFullBackup,
  createTableBackup,
  getBackupStats,
  getBackupHistory,
  validateBackupFile,
  getTablePreview
};