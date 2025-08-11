-- scripts/schema.sql
-- Script completo para crear las tablas en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eliminar tablas si existen (solo para desarrollo)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS transfer_recipients CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Crear tabla de usuarios
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

-- Crear tabla de estudiantes
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

-- Crear tabla de docentes
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  institution VARCHAR(255) NOT NULL,
  courses TEXT[], -- Array de cursos
  gender VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'retired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de transferencias
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

-- Crear tabla de destinatarios de transferencias múltiples
CREATE TABLE transfer_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID REFERENCES transfers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de logs de actividad
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

-- Índices para mejorar el rendimiento
CREATE INDEX idx_users_run ON users(run);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_transfers_from_user ON transfers(from_user_id);
CREATE INDEX idx_transfers_to_user ON transfers(to_user_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_created ON transfers(created_at);
CREATE INDEX idx_transfer_recipients_transfer ON transfer_recipients(transfer_id);
CREATE INDEX idx_transfer_recipients_user ON transfer_recipients(user_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- Triggers para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (ajustar según necesidades)
-- Permitir a los usuarios ver su propia información
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Permitir a los administradores ver todos los usuarios
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Insertar usuario de prueba (contraseña: 123)
-- NOTA: Primero generar el hash con: npm run generate-hash 123
-- Luego reemplazar $2a$10$YourHashHere con el hash generado
INSERT INTO users (
  run,
  password_hash,
  first_name,
  last_name,
  email,
  phone,
  role,
  balance,
  overdraft_limit,
  is_active
) VALUES (
  '18108750-1',
  '$2a$10$YourHashHere', -- REEMPLAZAR con hash real
  'Juan',
  'Pérez González',
  'juan.perez@banco.cl',
  '+56912345678',
  'student',
  1250000,
  500000,
  true
);

-- Obtener el ID del usuario insertado y crear el registro de estudiante
WITH inserted_user AS (
  SELECT id FROM users WHERE run = '18108750-1'
)
INSERT INTO students (
  user_id,
  birth_date,
  institution,
  course,
  gender,
  status
) SELECT 
  id,
  '2000-01-15',
  'Universidad de Chile',
  'Ingeniería Informática',
  'Masculino',
  'active'
FROM inserted_user;

-- Crear algunos usuarios adicionales para pruebas
-- NOTA: Generar hashes para cada contraseña antes de ejecutar
INSERT INTO users (run, password_hash, first_name, last_name, email, role, balance) VALUES
  ('12345678-9', '$2a$10$YourHashHere', 'María', 'González', 'maria.gonzalez@email.com', 'student', 50000),
  ('98765432-1', '$2a$10$YourHashHere', 'Pedro', 'Sánchez', 'pedro.sanchez@email.com', 'student', 75000),
  ('11111111-1', '$2a$10$YourHashHere', 'Ana', 'López', 'ana.lopez@email.com', 'student', 100000);

-- Crear registros de estudiantes para los usuarios adicionales
INSERT INTO students (user_id, birth_date, institution, course, gender, status)
SELECT 
  id,
  '2001-05-20',
  'Universidad de Chile',
  'Ingeniería Informática',
  'Femenino',
  'active'
FROM users WHERE run = '12345678-9';

INSERT INTO students (user_id, birth_date, institution, course, gender, status)
SELECT 
  id,
  '2000-08-15',
  'Universidad de Chile',
  'Ingeniería Informática',
  'Masculino',
  'active'
FROM users WHERE run = '98765432-1';

INSERT INTO students (user_id, birth_date, institution, course, gender, status)
SELECT 
  id,
  '2001-03-10',
  'Universidad de Chile',
  'Ingeniería Informática',
  'Femenino',
  'active'
FROM users WHERE run = '11111111-1';

-- Crear un usuario administrador para gestión
INSERT INTO users (
  run,
  password_hash,
  first_name,
  last_name,
  email,
  phone,
  role,
  balance,
  overdraft_limit,
  is_active
) VALUES (
  '11222333-4',
  '$2a$10$YourHashHere', -- REEMPLAZAR con hash de 'admin123'
  'Admin',
  'Sistema',
  'admin@bancarizate.cl',
  '+56911223344',
  'admin',
  0,
  0,
  true
);

-- Mensaje final
-- IMPORTANTE: Recuerda generar los hashes de contraseña antes de ejecutar este script
-- Usa: npm run generate-hash [contraseña] para cada usuario