// controllers/admin/courseController.js
const { supabase } = require('../../config/supabase');

// Obtener todos los cursos
const getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      institutionId = 'all', 
      level = 'all',
      active = 'all' 
    } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('courses')
      .select(`
        *,
        institutions!inner(
          id,
          name,
          type
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (institutionId !== 'all') {
      query = query.eq('institution_id', institutionId);
    }

    if (level !== 'all') {
      query = query.eq('level', level);
    }

    if (active !== 'all') {
      query = query.eq('is_active', active === 'true');
    }

    // Ordenar y paginar
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: courses, error, count } = await query;

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: {
        courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo cursos:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener cursos'
    });
  }
};

// Obtener cursos por institución
const getCoursesByInstitution = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { active = 'true', level = 'all' } = req.query;

    let query = supabase
      .from('courses')
      .select('*')
      .eq('institution_id', institutionId);

    if (active !== 'all') {
      query = query.eq('is_active', active === 'true');
    }

    if (level !== 'all') {
      query = query.eq('level', level);
    }

    query = query.order('name', { ascending: true });

    const { data: courses, error } = await query;

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: courses
    });

  } catch (error) {
    console.error('Error obteniendo cursos por institución:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener cursos'
    });
  }
};

// Obtener curso por ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        institutions!inner(
          id,
          name,
          type,
          address
        )
      `)
      .eq('id', id)
      .single();

    if (error || !course) {
      return res.status(404).json({
        status: 'error',
        message: 'Curso no encontrado'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        course
      }
    });

  } catch (error) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener curso'
    });
  }
};

// Crear curso
const createCourse = async (req, res) => {
  try {
    const {
      institutionId,
      name,
      code,
      level,
      durationMonths,
      description,
      isActive = true
    } = req.body;

    // Verificar que la institución existe
    const { data: institution, error: instError } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', institutionId)
      .single();

    if (instError || !institution) {
      return res.status(400).json({
        status: 'error',
        message: 'La institución seleccionada no existe'
      });
    }

    // Verificar si ya existe un curso con el mismo nombre en la misma institución
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('name', name)
      .single();

    if (existingCourse) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya existe un curso con este nombre en esta institución'
      });
    }

    // Verificar código único si se proporciona
    if (code) {
      const { data: existingCode } = await supabase
        .from('courses')
        .select('id')
        .eq('code', code)
        .single();

      if (existingCode) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un curso con este código'
        });
      }
    }

    // Crear curso
    const { data: newCourse, error } = await supabase
      .from('courses')
      .insert({
        institution_id: institutionId,
        name,
        code: code || null,
        level,
        duration_months: durationMonths || null,
        description: description || null,
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
        action: 'create_course',
        entity_type: 'course',
        entity_id: newCourse.id,
        metadata: { 
          courseName: name,
          institutionName: institution.name,
          level: level
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(201).json({
      status: 'success',
      message: 'Curso creado exitosamente',
      data: {
        course: newCourse
      }
    });

  } catch (error) {
    console.error('Error creando curso:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear curso'
    });
  }
};

// Actualizar curso
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el curso existe
    const { data: course, error: findError } = await supabase
      .from('courses')
      .select(`
        name,
        code,
        institutions!inner(name)
      `)
      .eq('id', id)
      .single();

    if (findError || !course) {
      return res.status(404).json({
        status: 'error',
        message: 'Curso no encontrado'
      });
    }

    // Verificar nombre duplicado en la misma institución si se está actualizando
    if (updates.name && updates.name !== course.name) {
      const { data: existingCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('institution_id', updates.institutionId)
        .eq('name', updates.name)
        .neq('id', id)
        .single();

      if (existingCourse) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un curso con este nombre en esta institución'
        });
      }
    }

    // Verificar código único si se está actualizando
    if (updates.code && updates.code !== course.code) {
      const { data: existingCode } = await supabase
        .from('courses')
        .select('id')
        .eq('code', updates.code)
        .neq('id', id)
        .single();

      if (existingCode) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un curso con este código'
        });
      }
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (updates.institutionId) updateData.institution_id = updates.institutionId;
    if (updates.name) updateData.name = updates.name;
    if (updates.code !== undefined) updateData.code = updates.code || null;
    if (updates.level) updateData.level = updates.level;
    if (updates.durationMonths !== undefined) updateData.duration_months = updates.durationMonths || null;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    updateData.updated_at = new Date().toISOString();

    // Actualizar curso
    const { error: updateError } = await supabase
      .from('courses')
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
        action: 'update_course',
        entity_type: 'course',
        entity_id: id,
        metadata: { 
          courseName: updates.name || course.name,
          institutionName: course.institutions.name,
          updatedFields: Object.keys(updateData)
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Curso actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando curso:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar curso'
    });
  }
};

// Eliminar curso
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el curso existe
    const { data: course, error: findError } = await supabase
      .from('courses')
      .select(`
        name,
        institutions!inner(name)
      `)
      .eq('id', id)
      .single();

    if (findError || !course) {
      return res.status(404).json({
        status: 'error',
        message: 'Curso no encontrado'
      });
    }

    // Verificar si hay estudiantes con este curso
    const { data: studentsWithCourse } = await supabase
      .from('students')
      .select('id')
      .eq('course', course.name)
      .limit(1);

    if (studentsWithCourse && studentsWithCourse.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se puede eliminar el curso porque hay estudiantes asociados'
      });
    }

    // Verificar si hay docentes con este curso
    const { data: teachersWithCourse } = await supabase
      .from('teachers')
      .select('id, courses')
      .contains('courses', [course.name])
      .limit(1);

    if (teachersWithCourse && teachersWithCourse.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se puede eliminar el curso porque hay docentes que lo imparten'
      });
    }

    // Eliminar curso
    const { error: deleteError } = await supabase
      .from('courses')
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
        action: 'delete_course',
        entity_type: 'course',
        entity_id: id,
        metadata: { 
          courseName: course.name,
          institutionName: course.institutions.name
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Curso eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando curso:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al eliminar curso'
    });
  }
};

// Obtener niveles de curso disponibles
const getCourseLevels = async (req, res) => {
  try {
    const levels = [
      { value: 'basico', label: 'Básico' },
      { value: 'medio', label: 'Medio' },
      { value: 'superior', label: 'Superior' },
      { value: 'postgrado', label: 'Postgrado' },
      { value: 'tecnico', label: 'Técnico' },
      { value: 'profesional', label: 'Profesional' }
    ];

    res.status(200).json({
      status: 'success',
      data: levels
    });

  } catch (error) {
    console.error('Error obteniendo niveles de curso:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener niveles de curso'
    });
  }
};

// Obtener estadísticas de cursos
const getCourseStats = async (req, res) => {
  try {
    // Total de cursos
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    // Cursos activos
    const { count: activeCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Cursos por nivel
    const { data: coursesByLevel } = await supabase
      .from('courses')
      .select('level')
      .eq('is_active', true);

    const levelStats = coursesByLevel.reduce((acc, course) => {
      acc[course.level] = (acc[course.level] || 0) + 1;
      return acc;
    }, {});

    // Cursos por institución
    const { data: coursesByInstitution } = await supabase
      .from('courses')
      .select(`
        institutions!inner(name)
      `)
      .eq('is_active', true);

    const institutionStats = coursesByInstitution.reduce((acc, course) => {
      const instName = course.institutions.name;
      acc[instName] = (acc[instName] || 0) + 1;
      return acc;
    }, {});

    // Cursos recientes (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    res.status(200).json({
      status: 'success',
      data: {
        total: totalCourses,
        active: activeCourses,
        inactive: totalCourses - activeCourses,
        byLevel: levelStats,
        byInstitution: institutionStats,
        recentlyAdded: recentCourses
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de cursos:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas'
    });
  }
};

module.exports = {
  getAllCourses,
  getCoursesByInstitution,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseLevels,
  getCourseStats
};