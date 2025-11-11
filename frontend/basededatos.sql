-- ===============================================
-- BANCARIZATE - BACKUP COMPLETO
-- ===============================================
-- Fecha de creación: 2025-11-08T20:14:14.714Z
-- Generado por: Hugo Martínez Torres (18108750-1)
-- Incluye datos: SÍ
-- Incluye logs: SÍ
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

-- ===============================================
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

-- ===============================================
-- DATOS DE LAS TABLAS
-- ===============================================

-- Datos para la tabla users
INSERT INTO users (id, run, password_hash, first_name, last_name, email, phone, role, balance, overdraft_limit, is_active, failed_login_attempts, locked_until, created_at, updated_at) VALUES
  ('4523f293-f1bc-4fe1-93d2-879d3f440906', '18108750-1', '$2a$10$uZyY1YwxfeKs0HFy31r8VOtVRgDGwbIgKtJCfPx9npMZpHNXDRJ1a', 'Hugo', 'Martínez Torres', 'hugomartinez@banco.cl', '+56912345678', 'admin', 7407054, 0, TRUE, 0, NULL, '2025-07-29T13:12:28.510252', '2025-11-08T17:53:52.152243'),
  ('229caacf-4050-4519-ba05-158d517abaa4', '11222333-4', '$2a$10$kHEFai0.SJkZ60a2y1OX2uTLRd3rUAD16SSSHe3fTfwy0hu.swz9a', 'Admin', 'Sistema', 'admin@bancarizate.cl', '+56911223344', 'admin', 152500, 0, TRUE, 0, NULL, '2025-07-29T13:12:30.082368', '2025-11-08T17:52:39.751676'),
  ('c5389655-23d4-480b-9fa3-3b38bb736b85', '26431919-6', '$2a$10$OFBdtzPcCH3oRLk0n7p1/uXpU8nbV4cO6HEcv9BU88eUGgelTchAe', 'Fabián Nicolás', 'Martínez Torres', 'fabian@gmail.com', '+56962009606', 'student', 1788480, 1000, TRUE, 0, NULL, '2025-07-30T02:05:45.330117', '2025-11-08T17:53:52.46733'),
  ('6841fb81-cbe7-4e46-9996-d6f40331d039', '16765902-0', '$2a$12$N0ZjUUykJfIzQ8I7u08JaOWKKiZOiNSFeiDAEIZZFq47JHK9h9h02', 'Claudia Cecilia', 'Torres Torres', 'claudia@gmail.com', '+56962009606', 'teacher', 8904468, 1000, TRUE, 0, NULL, '2025-07-30T02:14:54.098773', '2025-11-08T17:52:40.472244'),
  ('03046d63-d9c8-40d1-a4e7-50ce43daf19a', '18459554-0', '$2a$12$VmXh.Qvoxt/6mMMjkpWbqOZaRJAKkbaeOHmDYbfEgDQCnz.QePfQK', 'Stefano', 'Cristofori Veloso', 'stefano@banco.cl', '+56962009606', 'student', 1847498, 0, TRUE, 0, NULL, '2025-08-15T17:44:25.379758', '2025-11-08T17:52:41.026437');

-- Datos para la tabla institutions
INSERT INTO institutions (id, name, type, address, phone, email, website, is_active, created_at, updated_at) VALUES
  ('f7b5fd33-e948-4386-b2e5-996af76af26b', 'Colegio Mixto Inmaculada Concepción de Talcahuano', 'colegio', 'Bulnes 271, 4270076 Talcahuano, Bío Bío', '+56962009606', 'hugomartinezafv1992@gmail.com', 'https://www.inmacthno.cl', TRUE, '2025-08-01T21:03:00.320118', '2025-08-19T15:42:02.182064');

-- Datos para la tabla courses
INSERT INTO courses (id, institution_id, name, code, level, duration_months, description, is_active, created_at, updated_at) VALUES
  ('75e6be49-9826-4b00-974f-b62f691224e1', 'f7b5fd33-e948-4386-b2e5-996af76af26b', '6°B', '997854', 'basico', 8, NULL, TRUE, '2025-08-02T15:32:54.055596', '2025-08-02T15:32:54.055596');

-- Datos para la tabla students
INSERT INTO students (id, user_id, birth_date, institution, course, gender, status, created_at, updated_at) VALUES
  ('b7db8c8d-2620-4e60-8884-208e26a0caee', '4523f293-f1bc-4fe1-93d2-879d3f440906', '2000-01-15', 'Colegio Mixto Inmaculada Concepción de Talcahuano', '6°B', 'Masculino', 'active', '2025-07-29T13:12:28.622676', '2025-08-16T18:32:04.146451'),
  ('9e070e54-4da1-4305-9d91-490e842cff49', 'c5389655-23d4-480b-9fa3-3b38bb736b85', '2010-05-04', 'Colegio Mixto Inmaculada Concepción de Talcahuano', '6°B', 'Masculino', 'active', '2025-07-30T02:05:45.602234', '2025-08-02T20:01:48.018044'),
  ('3bf7db58-e38b-49c3-ac77-f4ff808dcf56', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', '1993-05-08', 'Colegio Mixto Inmaculada Concepción de Talcahuano', '6°B', 'Masculino', 'active', '2025-08-15T17:44:25.857591', '2025-08-16T17:26:05.275202');

-- Datos para la tabla teachers
INSERT INTO teachers (id, user_id, birth_date, institution, courses, gender, status, created_at, updated_at) VALUES
  ('f12d190e-5c76-44e0-96ef-b61b047d69cb', '6841fb81-cbe7-4e46-9996-d6f40331d039', '1987-11-30', 'Colegio Mixto Inmaculada Concepción de Talcahuano', '{"6°B"}', 'Femenino', 'active', '2025-07-30T02:14:54.224374', '2025-08-17T17:13:48.831128');

-- Datos para la tabla system_config
INSERT INTO system_config (id, config_key, config_value, description, data_type, category, min_value, max_value, is_editable, created_at, updated_at, updated_by) VALUES
  ('9b4c9ef3-5b94-4bcf-9f7d-1d4f1d102e2c', 'daily_transfer_limit', '10000000', 'Límite diario de dinero a transferir por usuario (CLP)', 'number', 'transfers', 100000, 1000000000, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('f9f5d0cd-e584-4ae0-92ed-c52836d5356f', 'min_transfer_amount', '1000', 'Monto mínimo por transferencia (CLP)', 'number', 'transfers', 100, 100000, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('c87f6ca3-b580-4902-bd49-9f9c457a3333', 'student_min_age', '15', 'Edad mínima para estudiantes', 'number', 'users', 10, 25, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('5ea56afe-baff-4a70-9aba-158bc3b52d58', 'max_transfer_amount', '5000000', 'Monto máximo por transferencia individual (CLP)', 'number', 'transfers', 1000, 100000000, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('5f278b12-66d3-43f5-88f6-9b0b0daca2e5', 'teacher_min_age', '22', 'Edad mínima para docentes', 'number', 'users', 18, 30, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('d35f0540-b8e5-4ad5-a21d-2286c5d34202', 'teacher_max_age', '70', 'Edad máxima para docentes', 'number', 'users', 25, 100, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('b6338a15-fbde-41ed-b012-ffe4a3414632', 'max_login_attempts', '5', 'Intentos máximos de login antes de bloqueo', 'number', 'security', 3, 20, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('1d97a6c1-7a7b-4198-adad-5955fca493ce', 'session_timeout_hours', '24', 'Horas de duración de sesión JWT', 'number', 'security', 1, 168, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('2d319849-bfb5-43f4-891b-d1f640982753', 'app_name', 'BANCARIZATE', 'Nombre de la aplicación', 'string', 'general', NULL, NULL, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('0db04328-f825-4fe2-8742-72286b829f2c', 'maintenance_mode', 'false', 'Modo de mantenimiento activado', 'boolean', 'general', NULL, NULL, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('6a7ce672-b3de-41ea-ae25-fe317e276a09', 'allow_registrations', 'false', 'Permitir auto-registro de usuarios', 'boolean', 'general', NULL, NULL, TRUE, '2025-08-01T03:42:34.415431', '2025-08-01T03:42:34.415431', NULL),
  ('5c5be151-5e93-4d72-8f96-a63ab3381935', 'lockout_duration_minutes', '5', 'Minutos de bloqueo tras intentos fallidos', 'number', 'security', 5, 1440, TRUE, '2025-08-01T03:42:34.415431', '2025-08-19T15:52:42.22826', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('32c9b6ee-85b8-4854-978d-556e9134225a', 'max_courses_per_teacher', '24', 'Máximo de cursos que puede dictar un docente', 'number', 'users', 1, 50, TRUE, '2025-08-01T03:42:34.415431', '2025-08-19T21:01:28.552853', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('fda7f115-59f0-465b-b5fe-e1dced144006', 'student_max_age', '18', 'Edad máxima para estudiantes', 'number', 'users', 18, 100, TRUE, '2025-08-01T03:42:34.415431', '2025-08-19T19:11:15.316273', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('4313730a-e1c2-4f14-ad68-b23cb5ab11dc', 'max_recipients_per_transfer', '40', 'Máximo de destinatarios por transferencia múltiple', 'number', 'transfers', 1, 100, TRUE, '2025-08-01T03:42:34.415431', '2025-09-01T23:32:29.816539', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('430964fa-3fbe-474a-9047-675ad1067fed', 'min_courses_per_teacher', '1', 'Mínimo de cursos que debe dictar un docente', 'number', 'users', 1, 10, TRUE, '2025-08-01T03:42:34.415431', '2025-08-19T21:00:48.626464', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('1e972dff-98f3-4453-881d-2798e9663b82', 'backup_retention_days', '30', 'Días para retener información de backups', 'number', 'general', 1, 365, TRUE, '2025-08-01T03:42:34.415431', '2025-08-19T21:12:57.479259', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('10cde598-8730-4198-af6b-294201be2645', 'max_daily_transfers', '160', 'Número máximo de transferencias por día por usuario', 'number', 'transfers', 1, 1000, TRUE, '2025-08-01T03:42:34.415431', '2025-09-01T23:32:29.519177', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('998c2314-ade5-437c-b90e-a0bb092482c3', 'rate_limit_bypass_admin', 'true', 'Default: true - Bypass rate limiting para admins', 'boolean', 'security', NULL, NULL, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('808fcf77-b4a6-4eee-8979-eab154b8c944', 'rate_limit_login_attempts_global', '5', 'Default: 5 - Intentos máximos de login por ventana', 'number', 'security', 1, 50, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('53c05a0d-7f17-4c57-b887-6fe4966e3adb', 'rate_limit_login_window_global', '15', 'Default: 15 - Ventana en minutos para intentos de login', 'number', 'security', 1, 60, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('b4091b27-297a-4c0d-92d3-b9adcd78666d', 'rate_limit_transfers_attempts_global', '10', 'Default: 10 - Intentos máximos de transferencias por ventana', 'number', 'transfers', 1, 100, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('c121b15a-c8bd-41b9-99a1-ef4fd558296f', 'rate_limit_development_mode', 'true', 'Default: false - Desactiva rate limiting en desarrollo', 'boolean', 'development', NULL, NULL, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:04:32.932769', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('7ba417e7-1b69-485d-8b1f-a676877735db', 'rate_limit_transfers_window_global', '5', 'Default: 5 - Ventana en minutos para transferencias', 'number', 'transfers', 1, 60, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('16c3ec2b-a8a5-4db7-b4cf-19b96380c803', 'rate_limit_password_change_attempts_global', '3', 'Default: 3 - Intentos máximos de cambio de contraseña por hora', 'number', 'security', 1, 10, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('79468252-4e29-4405-b10a-377718129491', 'rate_limit_password_change_window_global', '60', 'Default: 60 - Ventana en minutos para cambios de contraseña', 'number', 'security', 1, 120, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('a3c5c566-5d01-4361-826e-8e54dfe5ca8f', 'rate_limit_api_requests_attempts_global', '100', 'Default: 100 - Requests máximos por ventana', 'number', 'general', 10, 1000, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('04e73692-2229-4d89-b028-21cac6cc2347', 'rate_limit_api_requests_window_global', '15', 'Default: 15 - Ventana en minutos para requests API', 'number', 'general', 1, 60, TRUE, '2025-08-18T23:28:36.748933', '2025-11-08T16:03:30.844372', NULL),
  ('f95fcae8-5386-4d05-9e17-6aff740b7e10', 'password_change_limit_window_ms', '3600000', 'Ventana para cambios de contraseña (1 hora = 3600000ms)', 'number', 'security', 1800000, 7200000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('176d5baf-e428-4877-a88a-3328f656c1e6', 'create_user_limit_window_ms', '3600000', 'Ventana para creación de usuarios (1 hora = 3600000ms)', 'number', 'security', 1800000, 7200000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('d9d80853-e44d-41b3-942d-1b310d85f9ff', 'create_user_limit_max', '5', 'Máximo usuarios creados por hora', 'number', 'security', 5, 50, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('c75edf3e-bf1a-4a21-b06b-67a26c4c3a34', 'history_limit_window_ms', '60000', 'Ventana para consultas de historial (1 minuto = 60000ms)', 'number', 'security', 30000, 300000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('6d1a4c0a-6fe4-45a1-988a-f2d0c65a46c0', 'login_limit_window_ms', '900000', 'Ventana de tiempo para intentos de login (15 minutos = 900000ms)', 'number', 'security', 300000, 3600000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('57911be9-eb5c-4dad-aba4-1461021543fc', 'transfer_limit_window_ms', '300000', 'Ventana de tiempo para transferencias (5 minutos = 300000ms)', 'number', 'security', 60000, 1800000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('b0d88b86-b5d0-4a5b-bf61-a024822b0302', 'general_limit_max', '100', 'Máximo requests generales por IP en ventana de tiempo', 'number', 'security', 50, 1000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('92e0f350-8677-4fd6-a78a-4720a59ff40c', 'general_limit_window_ms', '900000', 'Ventana de tiempo para requests generales (15 minutos = 900000ms)', 'number', 'security', 300000, 3600000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('cfc552e8-7096-4188-9148-735194c5202c', 'user_search_limit_window_ms', '60000', 'Ventana para búsquedas de usuarios (1 minuto = 60000ms)', 'number', 'security', 30000, 300000, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('0d336130-350e-439b-8e12-71d53d7f17a2', 'transfer_limit_max', '5', 'Máximo transferencias por usuario en ventana de tiempo', 'number', 'security', 5, 50, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:58:01.544182', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('1229b4f1-5017-4085-9872-81444a82c202', 'user_search_limit_max', '50', 'Máximo búsquedas de usuarios por minuto', 'number', 'security', 10, 100, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('e883a07c-a675-4dc6-a160-fd03ebed137e', 'history_limit_max', '100', 'Máximo consultas de historial por minuto', 'number', 'security', 20, 200, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL),
  ('b03805ba-c364-4c7b-a598-c518f992460d', 'login_limit_max', '20', 'Máximo intentos de login por IP en ventana de tiempo', 'number', 'security', 3, 20, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', '4523f293-f1bc-4fe1-93d2-879d3f440906'),
  ('a9b35fb6-325f-4fc4-b55d-09552627673f', 'password_change_limit_max', '3', 'Máximo cambios de contraseña por hora', 'number', 'security', 1, 10, TRUE, '2025-08-19T13:47:09.375695', '2025-11-08T16:03:30.844372', NULL);

-- Datos para la tabla transfers
INSERT INTO transfers (id, from_user_id, to_user_id, amount, description, status, type, error_message, created_at, completed_at) VALUES
  ('cdb4bc61-16f5-4a10-9375-b8a3c34c3c9b', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 10000, 'Prueba', 'completed', 'single', NULL, '2025-07-30T18:18:26.029503', '2025-07-30T18:18:29.051'),
  ('7351bb5c-bf06-4327-a2ae-f3403f9b58a6', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 1000000, 'Prueba 2', 'completed', 'single', NULL, '2025-07-30T18:20:28.521873', '2025-07-30T18:20:31.519'),
  ('a38376eb-f015-4c26-a3e2-959fc621946f', 'c5389655-23d4-480b-9fa3-3b38bb736b85', '4523f293-f1bc-4fe1-93d2-879d3f440906', 1000000, 'Prueba 3', 'completed', 'single', NULL, '2025-07-30T18:22:02.661737', '2025-07-30T18:22:05.689'),
  ('6f33a4d8-a019-4151-ae1d-e5fe7d19c7b5', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 1240000, 'Prueba', 'completed', 'single', NULL, '2025-07-30T18:28:52.952559', '2025-07-30T18:28:55.963'),
  ('f4cbe8af-a55d-4b64-b5ed-01830220765d', 'c5389655-23d4-480b-9fa3-3b38bb736b85', '4523f293-f1bc-4fe1-93d2-879d3f440906', 250000, 'Prueba', 'completed', 'single', NULL, '2025-07-30T19:37:21.560045', '2025-07-30T19:37:24.641'),
  ('00c6a72e-d211-4d53-98d2-33aec65369c3', '4523f293-f1bc-4fe1-93d2-879d3f440906', NULL, 150000, 'Prueba masiva', 'completed', 'multiple', NULL, '2025-07-30T19:43:42.003741', '2025-07-30T19:43:45.485'),
  ('45c9f16b-1de4-4866-8179-6c6b25142ce0', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 1, 'Prueba', 'completed', 'single', NULL, '2025-07-30T21:13:24.846544', '2025-07-30T21:13:27.784'),
  ('12a05f28-e05e-4796-bc5d-90b66bee82bc', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 90000, 'Prueba uso', 'completed', 'single', NULL, '2025-07-31T00:19:56.706315', '2025-07-31T00:19:59.664'),
  ('9906154b-ed6b-420b-a414-59cc56975afb', '6841fb81-cbe7-4e46-9996-d6f40331d039', '4523f293-f1bc-4fe1-93d2-879d3f440906', 190001, 'todo', 'completed', 'single', NULL, '2025-07-31T00:21:55.166989', '2025-07-31T00:21:58.194'),
  ('41237cf3-0659-447f-8cd7-bf51882ebcb5', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 100000, 'Dinero', 'completed', 'single', NULL, '2025-07-31T00:33:44.853365', '2025-07-31T00:33:47.787'),
  ('73200598-7e08-46ea-94af-e64566ceae00', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 10000, 'enviado - recibido', 'completed', 'single', NULL, '2025-07-31T00:45:12.946505', '2025-07-31T00:45:15.88'),
  ('fcb24c0d-12b1-4437-b578-339c96aea978', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 10000, '09:08', 'completed', 'single', NULL, '2025-07-31T01:08:54.788575', '2025-07-31T01:08:57.73'),
  ('d354e662-881d-45ee-ae10-53e5a8045f37', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 5000, 'Tranfer 1', 'completed', 'single', NULL, '2025-07-31T17:04:49.399603', '2025-07-31T17:04:51.089'),
  ('d2de3f41-3a28-4e6f-b1d2-f75ab3a092c8', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 1000, 'trf', 'completed', 'single', NULL, '2025-07-31T21:16:46.128174', '2025-07-31T21:16:47.814'),
  ('1644cf9b-38b4-4ecc-84d2-2757ad2dbe3f', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 10000, 'prueba de transferencias', 'completed', 'single', NULL, '2025-07-31T21:49:10.829807', '2025-07-31T21:49:12.482'),
  ('7dbd5eb3-13a8-4683-97a8-5c4be428bf8d', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 10000, 'a', 'completed', 'single', NULL, '2025-08-01T03:32:38.308078', '2025-08-01T03:32:38.842'),
  ('4731f074-d797-46bf-b560-1f1c34903e03', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 1, '1', 'completed', 'single', NULL, '2025-08-01T03:32:56.815192', '2025-08-01T03:32:57.18'),
  ('fc849bbf-c9a1-4bb5-848d-d8408a7159e6', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 1, 'a', 'completed', 'single', NULL, '2025-08-01T03:33:08.873904', '2025-08-01T03:33:09.259'),
  ('19141d09-75e9-457a-9154-98bae3743575', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 1, 'a', 'completed', 'single', NULL, '2025-08-01T03:33:20.844876', '2025-08-01T03:33:21.241'),
  ('b7ea12b5-715c-4fa2-b79b-397fbb1d51f0', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 10000, 'a', 'completed', 'single', NULL, '2025-08-01T03:33:31.900562', '2025-08-01T03:33:32.314'),
  ('9e0270c0-288f-42ec-a4bd-dc396f808892', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 1, 'a', 'completed', 'single', NULL, '2025-08-01T03:33:45.043877', '2025-08-01T03:33:45.43'),
  ('aaa4a2ef-16db-4f88-908c-81c71862a291', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 10000, 'revision', 'completed', 'single', NULL, '2025-08-01T04:35:30.121661', '2025-08-01T04:35:30.494'),
  ('ef14ed51-6d5c-4452-82ed-5d313f5aa119', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 3000000, 'Multa', 'completed', 'single', NULL, '2025-08-03T02:28:12.803878', '2025-08-03T02:28:13.318'),
  ('f9b85457-89c1-43d0-809d-a73c37ab8172', '6841fb81-cbe7-4e46-9996-d6f40331d039', '4523f293-f1bc-4fe1-93d2-879d3f440906', 5000000, 'Devolución', 'completed', 'single', NULL, '2025-08-03T02:56:46.464222', '2025-08-03T02:56:46.89'),
  ('db01c820-6421-4369-a86d-ab16f91231a3', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 10000, 'Prueba en linea', 'completed', 'single', NULL, '2025-08-13T16:02:47.317667', '2025-08-13T16:02:48.786'),
  ('c4f91b37-ac5f-47c7-81e4-48e0b69b96ff', '4523f293-f1bc-4fe1-93d2-879d3f440906', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 980000, 'Trf de prueba', 'completed', 'single', NULL, '2025-08-24T01:24:02.620306', '2025-08-24T01:24:03.451'),
  ('751942c8-c7f3-4188-9afa-333b695f2e5b', '4523f293-f1bc-4fe1-93d2-879d3f440906', NULL, 19998, 'Trf. multiple', 'completed', 'multiple', NULL, '2025-09-01T20:11:47.659411', '2025-09-01T20:11:57.636'),
  ('5a0eed2a-f626-4c67-9b80-3ee4fc0f7daf', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 20000, 'dinero domingo', 'completed', 'single', NULL, '2025-09-08T00:42:04.117053', '2025-09-08T00:42:05.239'),
  ('662e8de1-5db9-4017-8667-57330aa640e5', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 83334, 'Transferencia dìa martes.', 'completed', 'single', NULL, '2025-09-09T19:18:03.762255', '2025-09-09T19:18:04.953'),
  ('2882d249-0d3b-40aa-8511-6c232eb63052', '4523f293-f1bc-4fe1-93d2-879d3f440906', NULL, 1999998, 'Prueba', 'completed', 'multiple', NULL, '2025-10-04T16:54:10.208335', '2025-10-04T16:54:12.502'),
  ('f9a09ce2-87f2-44c9-a15e-33c584a76045', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 10000, 'xs', 'completed', 'single', NULL, '2025-10-10T22:15:50.35671', '2025-10-10T22:15:51.333'),
  ('9c60b94c-4f83-44c6-9fcc-b34d80de80cf', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 10000, 'Prueba', 'completed', 'single', NULL, '2025-11-06T19:40:06.862495', '2025-11-06T19:40:07.664'),
  ('03449c4f-ef57-4fc7-88cd-7bd840e631a8', '4523f293-f1bc-4fe1-93d2-879d3f440906', NULL, 9999, 'Monto multiple', 'completed', 'multiple', NULL, '2025-11-07T01:14:35.332829', '2025-11-07T01:14:37.34'),
  ('1b9772dc-e454-454b-b2fe-177a1a2ca1ba', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 5000, 'trf 1', 'completed', 'single', NULL, '2025-11-08T16:58:45.002451', '2025-11-08T16:58:46.716'),
  ('abd762f9-eba8-404e-a9f9-bd65be80b608', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 5000, 'trf 2', 'completed', 'single', NULL, '2025-11-08T16:58:59.440037', '2025-11-08T16:59:00.909'),
  ('b6e42a3e-4b00-4253-834e-dbd5bd5e8026', '4523f293-f1bc-4fe1-93d2-879d3f440906', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 5000, 'trf 3', 'completed', 'single', NULL, '2025-11-08T16:59:12.832727', '2025-11-08T16:59:14.332'),
  ('11dcff28-a188-4478-bb0c-f57e3601b9bc', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 90000, 'trf 4', 'completed', 'single', NULL, '2025-11-08T16:59:26.768422', '2025-11-08T16:59:28.226'),
  ('92b95d21-53af-47fb-a42e-54d1125d466d', '4523f293-f1bc-4fe1-93d2-879d3f440906', '6841fb81-cbe7-4e46-9996-d6f40331d039', 40303, 'trf 5', 'completed', 'single', NULL, '2025-11-08T16:59:40.376857', '2025-11-08T16:59:41.858'),
  ('7599ebfc-4e86-4f99-86c9-d270f3f4d806', '4523f293-f1bc-4fe1-93d2-879d3f440906', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 33333, 'trf 6', 'completed', 'single', NULL, '2025-11-08T16:59:54.523279', '2025-11-08T16:59:56.027'),
  ('3271b220-2ae9-449f-9370-5287263873b7', '4523f293-f1bc-4fe1-93d2-879d3f440906', NULL, 600000, '4trf', 'completed', 'multiple', NULL, '2025-11-08T17:52:14.917548', '2025-11-08T17:52:17.672'),
  ('67e96ed6-fb6b-4658-bd54-e2d4416cf2fe', '4523f293-f1bc-4fe1-93d2-879d3f440906', NULL, 10000, '4 trf 2', 'completed', 'multiple', NULL, '2025-11-08T17:52:39.267786', '2025-11-08T17:52:42.228'),
  ('e3990ff8-17c5-4bf6-b84b-958aa9164f7a', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 324424, '1', 'completed', 'single', NULL, '2025-11-08T17:53:23.713705', '2025-11-08T17:53:25.166'),
  ('4954e2f5-ce2a-4761-878a-5c846771fd78', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 324234, '2', 'completed', 'single', NULL, '2025-11-08T17:53:38.969319', '2025-11-08T17:53:40.442'),
  ('2fbb5b07-e7e1-411f-a67b-fc39d832972a', '4523f293-f1bc-4fe1-93d2-879d3f440906', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 2323, '3', 'completed', 'single', NULL, '2025-11-08T17:53:52.035465', '2025-11-08T17:53:53.566');

-- Datos para la tabla transfer_recipients
INSERT INTO transfer_recipients (id, transfer_id, user_id, amount, status, created_at) VALUES
  ('3ab5c81c-0418-45b8-8b61-25e3b809de7c', '00c6a72e-d211-4d53-98d2-33aec65369c3', '6841fb81-cbe7-4e46-9996-d6f40331d039', 100000, 'completed', '2025-07-30T19:43:42.111179'),
  ('ac2b3ee9-3702-44df-b35e-ee89ebdebb6e', '00c6a72e-d211-4d53-98d2-33aec65369c3', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 50000, 'completed', '2025-07-30T19:43:42.111179'),
  ('488d6074-7095-47d1-9229-58e63b22d894', '751942c8-c7f3-4188-9afa-333b695f2e5b', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 6666, 'completed', '2025-09-01T20:11:47.810143'),
  ('6e84cd0a-fb31-42d6-86cb-c76fc90ccc9c', '751942c8-c7f3-4188-9afa-333b695f2e5b', '6841fb81-cbe7-4e46-9996-d6f40331d039', 6666, 'completed', '2025-09-01T20:11:47.810143'),
  ('1bb97d27-d731-45e0-be33-35010dd40cbf', '751942c8-c7f3-4188-9afa-333b695f2e5b', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 6666, 'completed', '2025-09-01T20:11:47.810143'),
  ('3883ee96-c339-4df6-bf21-1ecf8ed30111', '2882d249-0d3b-40aa-8511-6c232eb63052', '6841fb81-cbe7-4e46-9996-d6f40331d039', 666666, 'completed', '2025-10-04T16:54:10.686289'),
  ('3abf2e8b-484c-4cf5-a088-1d95b1c2e887', '2882d249-0d3b-40aa-8511-6c232eb63052', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 666666, 'completed', '2025-10-04T16:54:10.686289'),
  ('a6da3982-cf7c-4538-939d-27005b1ef93b', '2882d249-0d3b-40aa-8511-6c232eb63052', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 666666, 'completed', '2025-10-04T16:54:10.686289'),
  ('8aaba19a-1d61-4792-a07b-ad04bc84be79', '03449c4f-ef57-4fc7-88cd-7bd840e631a8', '6841fb81-cbe7-4e46-9996-d6f40331d039', 3333, 'completed', '2025-11-07T01:14:35.527275'),
  ('74fe5c2e-de8e-43bb-a717-6b9bd77d3cd4', '03449c4f-ef57-4fc7-88cd-7bd840e631a8', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 3333, 'completed', '2025-11-07T01:14:35.527275'),
  ('a3b0497a-ec52-4446-a254-018db4bc9526', '03449c4f-ef57-4fc7-88cd-7bd840e631a8', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 3333, 'completed', '2025-11-07T01:14:35.527275'),
  ('84379860-6f22-4156-b6e0-8304ce500231', '3271b220-2ae9-449f-9370-5287263873b7', '229caacf-4050-4519-ba05-158d517abaa4', 150000, 'completed', '2025-11-08T17:52:15.048258'),
  ('85325af6-fd57-426a-b0eb-78fbbc54909f', '3271b220-2ae9-449f-9370-5287263873b7', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 150000, 'completed', '2025-11-08T17:52:15.048258'),
  ('eba90cd6-fdec-4424-8dbd-46c72f8adf54', '3271b220-2ae9-449f-9370-5287263873b7', '6841fb81-cbe7-4e46-9996-d6f40331d039', 150000, 'completed', '2025-11-08T17:52:15.048258'),
  ('2649e02e-7656-442f-ba76-3aaff5595053', '3271b220-2ae9-449f-9370-5287263873b7', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 150000, 'completed', '2025-11-08T17:52:15.048258'),
  ('52d78042-39dc-42db-b0b4-112bc29f7e38', '67e96ed6-fb6b-4658-bd54-e2d4416cf2fe', '229caacf-4050-4519-ba05-158d517abaa4', 2500, 'completed', '2025-11-08T17:52:39.401455'),
  ('caf44b58-f8c9-4767-a99b-a4d2d742254c', '67e96ed6-fb6b-4658-bd54-e2d4416cf2fe', 'c5389655-23d4-480b-9fa3-3b38bb736b85', 2500, 'completed', '2025-11-08T17:52:39.401455'),
  ('f037174f-43aa-40f4-96ee-099b54109a92', '67e96ed6-fb6b-4658-bd54-e2d4416cf2fe', '6841fb81-cbe7-4e46-9996-d6f40331d039', 2500, 'completed', '2025-11-08T17:52:39.401455'),
  ('f7e3170a-bd3c-4b44-95ed-1d5b98c55387', '67e96ed6-fb6b-4658-bd54-e2d4416cf2fe', '03046d63-d9c8-40d1-a4e7-50ce43daf19a', 2500, 'completed', '2025-11-08T17:52:39.401455');

-- ===============================================
-- FIN DEL BACKUP
-- ===============================================
-- Backup completado: 2025-11-08T20:14:15.600Z
-- Total de líneas: 345
-- ===============================================

-- Verificar que todo esté correcto
SELECT 'BACKUP RESTAURADO EXITOSAMENTE' as mensaje;
