// controllers/admin/institutionController.js
const { supabase } = require('../../config/supabase');

// Obtener todas las instituciones
const getAllInstitutions = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', type = 'all', active = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('institutions')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (type !== 'all') {
      query = query.eq('type', type);
    }

    if (active !== 'all') {
      query = query.eq('is_active', active === 'true');
    }

    // Ordenar y paginar
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: institutions, error, count } = await query;

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: {
        institutions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo instituciones:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener instituciones'
    });
  }
};

// Obtener institución por ID
const getInstitutionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: institution, error } = await supabase
      .from('institutions')
      .select(`
        *,
        courses_count:courses(count)
      `)
      .eq('id', id)
      .single();

    if (error || !institution) {
      return res.status(404).json({
        status: 'error',
        message: 'Institución no encontrada'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        institution
      }
    });

  } catch (error) {
    console.error('Error obteniendo institución:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener institución'
    });
  }
};

// Crear institución
const createInstitution = async (req, res) => {
  try {
    const {
      name,
      type,
      address,
      phone,
      email,
      website,
      isActive = true
    } = req.body;

    // Verificar si ya existe una institución con el mismo nombre
    const { data: existingInstitution } = await supabase
      .from('institutions')
      .select('id')
      .eq('name', name)
      .single();

    if (existingInstitution) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya existe una institución con este nombre'
      });
    }

    // Crear institución
    const { data: newInstitution, error } = await supabase
      .from('institutions')
      .insert({
        name,
        type,
        address,
        phone,
        email,
        website,
        is_active: isActive
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'create_institution',
        entity_type: 'institution',
        entity_id: newInstitution.id,
        metadata: { 
          institutionName: name,
          type: type
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(201).json({
      status: 'success',
      message: 'Institución creada exitosamente',
      data: {
        institution: newInstitution
      }
    });

  } catch (error) {
    console.error('Error creando institución:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear institución'
    });
  }
};

// Actualizar institución
const updateInstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que la institución existe
    const { data: institution, error: findError } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', id)
      .single();

    if (findError || !institution) {
      return res.status(404).json({
        status: 'error',
        message: 'Institución no encontrada'
      });
    }

    // Verificar nombre duplicado si se está actualizando
    if (updates.name && updates.name !== institution.name) {
      const { data: existingInstitution } = await supabase
        .from('institutions')
        .select('id')
        .eq('name', updates.name)
        .neq('id', id)
        .single();

      if (existingInstitution) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe una institución con este nombre'
        });
      }
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.type) updateData.type = updates.type;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    updateData.updated_at = new Date().toISOString();

    // Actualizar institución
    const { error: updateError } = await supabase
      .from('institutions')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'update_institution',
        entity_type: 'institution',
        entity_id: id,
        metadata: { 
          institutionName: updates.name || institution.name,
          updatedFields: Object.keys(updateData)
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Institución actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando institución:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar institución'
    });
  }
};

// Eliminar institución
const deleteInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la institución existe
    const { data: institution, error: findError } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', id)
      .single();

    if (findError || !institution) {
      return res.status(404).json({
        status: 'error',
        message: 'Institución no encontrada'
      });
    }

    // Verificar si hay cursos asociados
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('institution_id', id)
      .limit(1);

    if (courses && courses.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se puede eliminar la institución porque tiene cursos asociados'
      });
    }

    // Verificar si hay usuarios asociados
    const { data: studentsWithInstitution } = await supabase
      .from('students')
      .select('id')
      .eq('institution', institution.name)
      .limit(1);

    const { data: teachersWithInstitution } = await supabase
      .from('teachers')
      .select('id')
      .eq('institution', institution.name)
      .limit(1);

    if ((studentsWithInstitution && studentsWithInstitution.length > 0) || 
        (teachersWithInstitution && teachersWithInstitution.length > 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'No se puede eliminar la institución porque tiene estudiantes o docentes asociados'
      });
    }

    // Eliminar institución
    const { error: deleteError } = await supabase
      .from('institutions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'delete_institution',
        entity_type: 'institution',
        entity_id: id,
        metadata: { 
          institutionName: institution.name
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Institución eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando institución:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al eliminar institución'
    });
  }
};

// Obtener tipos de institución disponibles
const getInstitutionTypes = async (req, res) => {
  try {
    const types = [
      { value: 'universidad', label: 'Universidad' },
      { value: 'instituto', label: 'Instituto' },
      { value: 'colegio', label: 'Colegio' },
      { value: 'escuela', label: 'Escuela' },
      { value: 'centro_formacion', label: 'Centro de Formación' }
    ];

    res.status(200).json({
      status: 'success',
      data: types
    });

  } catch (error) {
    console.error('Error obteniendo tipos de institución:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener tipos de institución'
    });
  }
};

// Obtener estadísticas de instituciones
const getInstitutionStats = async (req, res) => {
  try {
    // Total de instituciones
    const { count: totalInstitutions } = await supabase
      .from('institutions')
      .select('*', { count: 'exact', head: true });

    // Instituciones activas
    const { count: activeInstitutions } = await supabase
      .from('institutions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Instituciones por tipo
    const { data: institutionsByType } = await supabase
      .from('institutions')
      .select('type')
      .eq('is_active', true);

    const typeStats = institutionsByType.reduce((acc, inst) => {
      acc[inst.type] = (acc[inst.type] || 0) + 1;
      return acc;
    }, {});

    // Instituciones recientes (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentInstitutions } = await supabase
      .from('institutions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    res.status(200).json({
      status: 'success',
      data: {
        total: totalInstitutions,
        active: activeInstitutions,
        inactive: totalInstitutions - activeInstitutions,
        byType: typeStats,
        recentlyAdded: recentInstitutions
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de instituciones:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas'
    });
  }
};

module.exports = {
  getAllInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  getInstitutionTypes,
  getInstitutionStats
};