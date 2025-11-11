-- ===============================================
-- MIGRATION: Configuración de Notificaciones
-- ===============================================
-- Fecha: 2025-11-11
-- Descripción: Agrega configuración de notificaciones al sistema
-- ===============================================

-- Insertar configuraciones de notificaciones en system_config
INSERT INTO system_config (config_key, config_value, description, data_type, category, is_editable)
VALUES
  -- Estado general
  ('notifications_enabled', 'true', 'Activar/desactivar notificaciones globalmente', 'boolean', 'notifications', true),

  -- Posición
  ('notifications_position', 'bottom-right', 'Posición de las notificaciones (top-left, top-center, top-right, bottom-left, bottom-center, bottom-right)', 'string', 'notifications', true),

  -- Tamaño
  ('notifications_size', 'medium', 'Tamaño de las notificaciones (small, medium, large)', 'string', 'notifications', true),

  -- Duración
  ('notifications_duration', '8000', 'Duración de las notificaciones en milisegundos', 'number', 'notifications', true),

  -- Colores - Gradiente principal
  ('notifications_gradient_from', '#193cb8', 'Color inicial del gradiente del icono', 'string', 'notifications', true),
  ('notifications_gradient_to', '#0e2167', 'Color final del gradiente del icono', 'string', 'notifications', true),

  -- Colores - Barra de progreso
  ('notifications_progress_from', '#193cb8', 'Color inicial de la barra de progreso', 'string', 'notifications', true),
  ('notifications_progress_to', '#0e2167', 'Color final de la barra de progreso', 'string', 'notifications', true),

  -- Colores - Otros
  ('notifications_border_color', '#dbeafe', 'Color del borde de la notificación', 'string', 'notifications', true),
  ('notifications_bg_color', '#ffffff', 'Color de fondo de la notificación', 'string', 'notifications', true),
  ('notifications_title_color', '#111827', 'Color del título', 'string', 'notifications', true),
  ('notifications_text_color', '#374151', 'Color del texto principal', 'string', 'notifications', true),
  ('notifications_description_color', '#6b7280', 'Color del texto de descripción', 'string', 'notifications', true),

  -- Elementos visibles
  ('notifications_show_progress_bar', 'true', 'Mostrar barra de progreso', 'boolean', 'notifications', true),
  ('notifications_show_close_button', 'true', 'Mostrar botón de cerrar', 'boolean', 'notifications', true),
  ('notifications_show_money_icon', 'true', 'Mostrar icono de dinero', 'boolean', 'notifications', true),
  ('notifications_show_description', 'true', 'Mostrar descripción del mensaje', 'boolean', 'notifications', true),
  ('notifications_play_sound', 'false', 'Reproducir sonido al recibir notificación', 'boolean', 'notifications', true),
  ('notifications_sound_data', '', 'Datos del archivo de sonido personalizado (base64)', 'string', 'notifications', true)

ON CONFLICT (config_key) DO UPDATE
SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  data_type = EXCLUDED.data_type,
  category = EXCLUDED.category,
  is_editable = EXCLUDED.is_editable,
  updated_at = NOW();

-- Crear índice para búsquedas rápidas por categoría
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Configuración de notificaciones agregada exitosamente';
END $$;
