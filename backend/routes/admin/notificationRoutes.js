// routes/admin/notificationRoutes.js - Rutas para configuración de notificaciones

const express = require('express');
const router = express.Router();
const { supabase } = require('../../config/supabase');
const { auth, authorize } = require('../../middleware/auth');

// ==========================================
// OBTENER CONFIGURACIÓN DE NOTIFICACIONES
// ==========================================
router.get('/config', auth, async (req, res) => {
  try {
    console.log('📧 Obteniendo configuración de notificaciones...');

    // Obtener todas las configuraciones de notificaciones
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('config_key, config_value, data_type')
      .eq('category', 'notifications')
      .eq('is_editable', true);

    if (error) {
      console.error('❌ Error obteniendo configuración:', error);
      throw error;
    }

    // Convertir a objeto de configuración
    const notificationConfig = {
      enabled: true,
      position: 'bottom-right',
      size: 'medium',
      duration: 8000,
      colors: {
        gradientFrom: '#193cb8',
        gradientTo: '#0e2167',
        progressBarFrom: '#193cb8',
        progressBarTo: '#0e2167',
        borderColor: '#dbeafe',
        backgroundColor: '#ffffff',
        titleColor: '#111827',
        textColor: '#374151',
        descriptionColor: '#6b7280',
      },
      showProgressBar: true,
      showCloseButton: true,
      showMoneyIcon: true,
      showDescription: true,
      playSound: false,
      soundData: '',
    };

    // Mapear valores de la base de datos
    if (configs && configs.length > 0) {
      configs.forEach(config => {
        const key = config.config_key.replace('notifications_', '');
        let value = config.config_value;

        // Convertir según el tipo de dato
        if (config.data_type === 'boolean') {
          value = value === 'true';
        } else if (config.data_type === 'number') {
          value = parseInt(value, 10);
        }

        // Mapear a la estructura correcta
        switch (key) {
          case 'enabled':
            notificationConfig.enabled = value;
            break;
          case 'position':
            notificationConfig.position = value;
            break;
          case 'size':
            notificationConfig.size = value;
            break;
          case 'duration':
            notificationConfig.duration = value;
            break;
          case 'gradient_from':
            notificationConfig.colors.gradientFrom = value;
            break;
          case 'gradient_to':
            notificationConfig.colors.gradientTo = value;
            break;
          case 'progress_from':
            notificationConfig.colors.progressBarFrom = value;
            break;
          case 'progress_to':
            notificationConfig.colors.progressBarTo = value;
            break;
          case 'border_color':
            notificationConfig.colors.borderColor = value;
            break;
          case 'bg_color':
            notificationConfig.colors.backgroundColor = value;
            break;
          case 'title_color':
            notificationConfig.colors.titleColor = value;
            break;
          case 'text_color':
            notificationConfig.colors.textColor = value;
            break;
          case 'description_color':
            notificationConfig.colors.descriptionColor = value;
            break;
          case 'show_progress_bar':
            notificationConfig.showProgressBar = value;
            break;
          case 'show_close_button':
            notificationConfig.showCloseButton = value;
            break;
          case 'show_money_icon':
            notificationConfig.showMoneyIcon = value;
            break;
          case 'show_description':
            notificationConfig.showDescription = value;
            break;
          case 'play_sound':
            notificationConfig.playSound = value;
            break;
          case 'sound_data':
            notificationConfig.soundData = value;
            break;
        }
      });
    }

    console.log('✅ Configuración obtenida exitosamente');

    res.status(200).json({
      status: 'success',
      data: notificationConfig,
    });
  } catch (error) {
    console.error('❌ Error en GET /config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener configuración de notificaciones',
      error: error.message,
    });
  }
});

// ==========================================
// ACTUALIZAR CONFIGURACIÓN DE NOTIFICACIONES
// ==========================================
router.put('/config', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('💾 Actualizando configuración de notificaciones...');
    const config = req.body;
    const userId = req.user.id;

    // Mapear configuración a claves de base de datos
    const updates = [
      { key: 'notifications_enabled', value: String(config.enabled) },
      { key: 'notifications_position', value: config.position },
      { key: 'notifications_size', value: config.size },
      { key: 'notifications_duration', value: String(config.duration) },
      { key: 'notifications_gradient_from', value: config.colors.gradientFrom },
      { key: 'notifications_gradient_to', value: config.colors.gradientTo },
      { key: 'notifications_progress_from', value: config.colors.progressBarFrom },
      { key: 'notifications_progress_to', value: config.colors.progressBarTo },
      { key: 'notifications_border_color', value: config.colors.borderColor },
      { key: 'notifications_bg_color', value: config.colors.backgroundColor },
      { key: 'notifications_title_color', value: config.colors.titleColor },
      { key: 'notifications_text_color', value: config.colors.textColor },
      { key: 'notifications_description_color', value: config.colors.descriptionColor },
      { key: 'notifications_show_progress_bar', value: String(config.showProgressBar) },
      { key: 'notifications_show_close_button', value: String(config.showCloseButton) },
      { key: 'notifications_show_money_icon', value: String(config.showMoneyIcon) },
      { key: 'notifications_show_description', value: String(config.showDescription) },
      { key: 'notifications_play_sound', value: String(config.playSound) },
      { key: 'notifications_sound_data', value: config.soundData || '' },
    ];

    // Actualizar cada configuración
    const updatePromises = updates.map(async ({ key, value }) => {
      const { error } = await supabase
        .from('system_config')
        .update({
          config_value: value,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('config_key', key);

      if (error) {
        console.error(`❌ Error actualizando ${key}:`, error);
        throw error;
      }
    });

    await Promise.all(updatePromises);

    // Registrar actividad
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: 'update_notification_config',
      details: 'Configuración de notificaciones actualizada',
      metadata: { config },
    });

    console.log('✅ Configuración actualizada exitosamente');

    res.status(200).json({
      status: 'success',
      message: 'Configuración de notificaciones actualizada exitosamente',
      data: config,
    });
  } catch (error) {
    console.error('❌ Error en PUT /config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar configuración de notificaciones',
      error: error.message,
    });
  }
});

// ==========================================
// RESTABLECER CONFIGURACIÓN POR DEFECTO
// ==========================================
router.post('/config/reset', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('🔄 Restableciendo configuración por defecto...');
    const userId = req.user.id;

    // Configuración por defecto
    const defaultConfig = {
      enabled: true,
      position: 'bottom-right',
      size: 'medium',
      duration: 8000,
      colors: {
        gradientFrom: '#193cb8',
        gradientTo: '#0e2167',
        progressBarFrom: '#193cb8',
        progressBarTo: '#0e2167',
        borderColor: '#dbeafe',
        backgroundColor: '#ffffff',
        titleColor: '#111827',
        textColor: '#374151',
        descriptionColor: '#6b7280',
      },
      showProgressBar: true,
      showCloseButton: true,
      showMoneyIcon: true,
      showDescription: true,
      playSound: false,
      soundData: '',
    };

    // Mapear a actualizaciones
    const updates = [
      { key: 'notifications_enabled', value: 'true' },
      { key: 'notifications_position', value: 'bottom-right' },
      { key: 'notifications_size', value: 'medium' },
      { key: 'notifications_duration', value: '8000' },
      { key: 'notifications_gradient_from', value: '#193cb8' },
      { key: 'notifications_gradient_to', value: '#0e2167' },
      { key: 'notifications_progress_from', value: '#193cb8' },
      { key: 'notifications_progress_to', value: '#0e2167' },
      { key: 'notifications_border_color', value: '#dbeafe' },
      { key: 'notifications_bg_color', value: '#ffffff' },
      { key: 'notifications_title_color', value: '#111827' },
      { key: 'notifications_text_color', value: '#374151' },
      { key: 'notifications_description_color', value: '#6b7280' },
      { key: 'notifications_show_progress_bar', value: 'true' },
      { key: 'notifications_show_close_button', value: 'true' },
      { key: 'notifications_show_money_icon', value: 'true' },
      { key: 'notifications_show_description', value: 'true' },
      { key: 'notifications_play_sound', value: 'false' },
      { key: 'notifications_sound_data', value: '' },
    ];

    // Actualizar cada configuración
    const updatePromises = updates.map(async ({ key, value }) => {
      const { error } = await supabase
        .from('system_config')
        .update({
          config_value: value,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('config_key', key);

      if (error) throw error;
    });

    await Promise.all(updatePromises);

    // Registrar actividad
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: 'reset_notification_config',
      details: 'Configuración de notificaciones restablecida a valores por defecto',
    });

    console.log('✅ Configuración restablecida exitosamente');

    res.status(200).json({
      status: 'success',
      message: 'Configuración restablecida a valores por defecto',
      data: defaultConfig,
    });
  } catch (error) {
    console.error('❌ Error en POST /config/reset:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al restablecer configuración',
      error: error.message,
    });
  }
});

module.exports = router;
