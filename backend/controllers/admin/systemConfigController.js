// controllers/admin/systemConfigController.js
const { supabase } = require('../../config/supabase');

// Obtener todas las configuraciones
const getAllConfigurations = async (req, res) => {
  try {
    const { category = 'all', editable = 'all' } = req.query;

    let query = supabase
      .from('system_config')
      .select('*');

    // Aplicar filtros
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (editable !== 'all') {
      query = query.eq('is_editable', editable === 'true');
    }

    // Ordenar por categoría y luego por clave
    query = query.order('category').order('config_key');

    const { data: configurations, error } = await query;

    if (error) {
      throw error;
    }

    // Agrupar por categoría
    const groupedConfigs = configurations.reduce((acc, config) => {
      const category = config.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(config);
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: {
        configurations,
        grouped: groupedConfigs,
        categories: Object.keys(groupedConfigs)
      }
    });

  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener configuraciones'
    });
  }
};

// Obtener configuración por clave
const getConfigurationByKey = async (req, res) => {
  try {
    const { key } = req.params;

    const { data: configuration, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', key)
      .single();

    if (error || !configuration) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuración no encontrada'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        configuration
      }
    });

  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener configuración'
    });
  }
};

// Obtener configuraciones por categoría
const getConfigurationsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const { data: configurations, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('category', category)
      .order('config_key');

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: configurations
    });

  } catch (error) {
    console.error('Error obteniendo configuraciones por categoría:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener configuraciones'
    });
  }
};

// Actualizar configuración
const updateConfiguration = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({
        status: 'error',
        message: 'El valor de la configuración es requerido'
      });
    }

    // Verificar que la configuración existe y es editable
    const { data: configuration, error: findError } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', key)
      .single();

    if (findError || !configuration) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuración no encontrada'
      });
    }

    if (!configuration.is_editable) {
      return res.status(403).json({
        status: 'error',
        message: 'Esta configuración no es editable'
      });
    }

    // Validar tipo de dato
    let validatedValue = value;
    
    if (configuration.data_type === 'number') {
      validatedValue = parseFloat(value);
      
      if (isNaN(validatedValue)) {
        return res.status(400).json({
          status: 'error',
          message: 'El valor debe ser un número válido'
        });
      }

      // Validar rango si está definido
      if (configuration.min_value !== null && validatedValue < configuration.min_value) {
        return res.status(400).json({
          status: 'error',
          message: `El valor debe ser mayor o igual a ${configuration.min_value}`
        });
      }

      if (configuration.max_value !== null && validatedValue > configuration.max_value) {
        return res.status(400).json({
          status: 'error',
          message: `El valor debe ser menor o igual a ${configuration.max_value}`
        });
      }
    } else if (configuration.data_type === 'boolean') {
      if (typeof value === 'string') {
        validatedValue = value.toLowerCase() === 'true';
      } else {
        validatedValue = Boolean(value);
      }
    } else if (configuration.data_type === 'string') {
      validatedValue = String(value);
    }

    // Actualizar configuración
    const { error: updateError } = await supabase
      .from('system_config')
      .update({
        config_value: validatedValue.toString(),
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('config_key', key);

    if (updateError) {
      throw updateError;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'update_system_config',
        entity_type: 'system_config',
        entity_id: configuration.id,
        metadata: { 
          configKey: key,
          oldValue: configuration.config_value,
          newValue: validatedValue.toString(),
          category: configuration.category
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Configuración actualizada exitosamente',
      data: {
        key,
        oldValue: configuration.config_value,
        newValue: validatedValue.toString()
      }
    });

  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar configuración'
    });
  }
};

// Actualizar múltiples configuraciones
const updateMultipleConfigurations = async (req, res) => {
  try {
    const { configurations } = req.body;

    if (!Array.isArray(configurations) || configurations.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requiere un array de configuraciones'
      });
    }

    const results = [];
    const errors = [];

    // Procesar cada configuración
    for (const config of configurations) {
      const { key, value } = config;

      try {
        // Verificar que la configuración existe y es editable
        const { data: existingConfig, error: findError } = await supabase
          .from('system_config')
          .select('*')
          .eq('config_key', key)
          .single();

        if (findError || !existingConfig) {
          errors.push({ key, error: 'Configuración no encontrada' });
          continue;
        }

        if (!existingConfig.is_editable) {
          errors.push({ key, error: 'Configuración no editable' });
          continue;
        }

        // Validar y convertir valor
        let validatedValue = value;
        
        if (existingConfig.data_type === 'number') {
          validatedValue = parseFloat(value);
          
          if (isNaN(validatedValue)) {
            errors.push({ key, error: 'Valor debe ser numérico' });
            continue;
          }

          if (existingConfig.min_value !== null && validatedValue < existingConfig.min_value) {
            errors.push({ key, error: `Valor mínimo: ${existingConfig.min_value}` });
            continue;
          }

          if (existingConfig.max_value !== null && validatedValue > existingConfig.max_value) {
            errors.push({ key, error: `Valor máximo: ${existingConfig.max_value}` });
            continue;
          }
        } else if (existingConfig.data_type === 'boolean') {
          if (typeof value === 'string') {
            validatedValue = value.toLowerCase() === 'true';
          } else {
            validatedValue = Boolean(value);
          }
        }

        // Actualizar configuración
        const { error: updateError } = await supabase
          .from('system_config')
          .update({
            config_value: validatedValue.toString(),
            updated_at: new Date().toISOString(),
            updated_by: req.user.id
          })
          .eq('config_key', key);

        if (updateError) {
          errors.push({ key, error: updateError.message });
          continue;
        }

        // Registrar actividad
        await supabase
          .from('activity_logs')
          .insert({
            user_id: req.user.id,
            action: 'update_system_config',
            entity_type: 'system_config',
            entity_id: existingConfig.id,
            metadata: { 
              configKey: key,
              oldValue: existingConfig.config_value,
              newValue: validatedValue.toString(),
              category: existingConfig.category,
              batchUpdate: true
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent')
          });

        results.push({
          key,
          oldValue: existingConfig.config_value,
          newValue: validatedValue.toString(),
          status: 'success'
        });

      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    res.status(200).json({
      status: errors.length === 0 ? 'success' : 'partial',
      message: `${results.length} configuraciones actualizadas${errors.length > 0 ? `, ${errors.length} con errores` : ''}`,
      data: {
        updated: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error actualizando múltiples configuraciones:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar configuraciones'
    });
  }
};

// Resetear configuración a valor por defecto
const resetConfiguration = async (req, res) => {
  try {
    const { key } = req.params;

    // Verificar que la configuración existe
    const { data: configuration, error: findError } = await supabase
      .from('system_config')
      .select('*')
      .eq('config_key', key)
      .single();

    if (findError || !configuration) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuración no encontrada'
      });
    }

    if (!configuration.is_editable) {
      return res.status(403).json({
        status: 'error',
        message: 'Esta configuración no es editable'
      });
    }

    // Para resetear, necesitaríamos tener valores por defecto almacenados
    // Por ahora, mantenemos la funcionalidad básica
    res.status(200).json({
      status: 'info',
      message: 'Funcionalidad de reset en desarrollo',
      data: {
        key,
        currentValue: configuration.config_value
      }
    });

  } catch (error) {
    console.error('Error reseteando configuración:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al resetear configuración'
    });
  }
};

// Obtener categorías disponibles
const getCategories = async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('system_config')
      .select('category')
      .order('category');

    if (error) {
      throw error;
    }

    const uniqueCategories = [...new Set(categories.map(c => c.category))];
    
    const categoryLabels = {
      'transfers': 'Transferencias',
      'users': 'Usuarios',
      'security': 'Seguridad',
      'general': 'General'
    };

    const categoriesWithLabels = uniqueCategories.map(cat => ({
      value: cat,
      label: categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)
    }));

    res.status(200).json({
      status: 'success',
      data: categoriesWithLabels
    });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener categorías'
    });
  }
};

// Obtener historial de cambios de configuración
const getConfigurationHistory = async (req, res) => {
  try {
    const { key } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Obtener logs de actividad para esta configuración
    const { data: logs, error, count } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users!inner(
          run,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .eq('action', 'update_system_config')
      .contains('metadata', { configKey: key })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: {
        history: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de configuración:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener historial'
    });
  }
};

module.exports = {
  getAllConfigurations,
  getConfigurationByKey,
  getConfigurationsByCategory,
  updateConfiguration,
  updateMultipleConfigurations,
  resetConfiguration,
  getCategories,
  getConfigurationHistory
};