// scripts/initAdminTables.js
// Script para inicializar las nuevas tablas administrativas en Supabase

const { supabase } = require('../config/supabase');

async function initAdminTables() {
    console.log('🚀 Inicializando tablas administrativas en BANCARIZATE...\n');

    try {
        // Verificar conexión
        console.log('📡 Verificando conexión con Supabase...');
        const { data: testConnection, error: connError } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (connError) {
            console.error('❌ Error de conexión:', connError.message);
            process.exit(1);
        }

        console.log('✅ Conexión establecida con Supabase\n');

        // 1. Crear tabla institutions
        console.log('🏫 Creando tabla institutions...');
        try {
            // Verificar si ya existe
            const { data: existingInstitutions } = await supabase
                .from('institutions')
                .select('id')
                .limit(1);

            if (existingInstitutions) {
                console.log('⚠️  Tabla institutions ya existe, saltando...');
            } else {
                throw new Error('Tabla no existe, necesita ser creada via SQL');
            }
        } catch (error) {
            console.log('📝 La tabla institutions debe crearse ejecutando el schema SQL en Supabase');
        }

        // 2. Crear tabla courses
        console.log('📚 Verificando tabla courses...');
        try {
            const { data: existingCourses } = await supabase
                .from('courses')
                .select('id')
                .limit(1);

            if (existingCourses) {
                console.log('⚠️  Tabla courses ya existe, saltando...');
            } else {
                throw new Error('Tabla no existe');
            }
        } catch (error) {
            console.log('📝 La tabla courses debe crearse ejecutando el schema SQL en Supabase');
        }

        // 3. Crear tabla system_config
        console.log('⚙️ Verificando tabla system_config...');
        try {
            const { data: existingConfig } = await supabase
                .from('system_config')
                .select('id')
                .limit(1);

            if (existingConfig) {
                console.log('⚠️  Tabla system_config ya existe, saltando...');
            } else {
                throw new Error('Tabla no existe');
            }
        } catch (error) {
            console.log('📝 La tabla system_config debe crearse ejecutando el schema SQL en Supabase');
        }

        // 4. Poblar instituciones de ejemplo
        console.log('\n🏫 Poblando instituciones de ejemplo...');
        await populateInstitutions();

        // 5. Poblar cursos de ejemplo
        console.log('📚 Poblando cursos de ejemplo...');
        await populateCourses();

        // 6. Poblar configuraciones del sistema
        console.log('⚙️ Poblando configuraciones del sistema...');
        await populateSystemConfig();

        console.log('\n✨ Inicialización de tablas administrativas completada!');
        console.log('\n📝 Resumen:');
        console.log('   ✅ Tablas verificadas/creadas');
        console.log('   ✅ Instituciones de ejemplo pobladas');
        console.log('   ✅ Cursos de ejemplo poblados');
        console.log('   ✅ Configuraciones del sistema establecidas');
        console.log('\n🚀 El panel administrativo ya está listo para usar!');

    } catch (error) {
        console.error('\n❌ Error inicializando tablas administrativas:', error.message);
        process.exit(1);
    }
}

// Función para poblar instituciones
async function populateInstitutions() {
    const institutionsData = [
        {
            name: 'Universidad de Chile',
            type: 'universidad',
            address: 'Av. Libertador Bernardo O\'Higgins 1058, Santiago',
            phone: '+56 2 2978 2000',
            email: 'contacto@uchile.cl',
            website: 'https://www.uchile.cl',
            is_active: true
        },
        {
            name: 'Pontificia Universidad Católica de Chile',
            type: 'universidad',
            address: 'Av. Libertador Bernardo O\'Higgins 340, Santiago',
            phone: '+56 2 2354 4000',
            email: 'info@uc.cl',
            website: 'https://www.uc.cl',
            is_active: true
        },
        {
            name: 'Universidad de Santiago de Chile',
            type: 'universidad',
            address: 'Av. Libertador Bernardo O\'Higgins 3363, Estación Central',
            phone: '+56 2 2718 0000',
            email: 'contacto@usach.cl',
            website: 'https://www.usach.cl',
            is_active: true
        },
        {
            name: 'Instituto Nacional',
            type: 'colegio',
            address: 'Arturo Prat 33, Santiago Centro',
            phone: '+56 2 2787 7100',
            email: 'secretaria@institutonacional.cl',
            is_active: true
        },
        {
            name: 'INACAP',
            type: 'instituto',
            address: 'Múltiples sedes',
            phone: '+56 600 462 2247',
            email: 'contacto@inacap.cl',
            website: 'https://www.inacap.cl',
            is_active: true
        },
        {
            name: 'DUOC UC',
            type: 'instituto',
            address: 'Múltiples sedes',
            phone: '+56 600 386 2822',
            email: 'info@duoc.cl',
            website: 'https://www.duoc.cl',
            is_active: true
        }
    ];

    for (const institution of institutionsData) {
        try {
            // Verificar si ya existe
            const { data: existing } = await supabase
                .from('institutions')
                .select('id')
                .eq('name', institution.name)
                .single();

            if (!existing) {
                const { error } = await supabase
                    .from('institutions')
                    .insert(institution);

                if (error) {
                    console.error(`❌ Error creando institución ${institution.name}:`, error.message);
                } else {
                    console.log(`   ✅ ${institution.name} creada`);
                }
            } else {
                console.log(`   ⚠️  ${institution.name} ya existe`);
            }
        } catch (error) {
            console.error(`❌ Error con institución ${institution.name}:`, error.message);
        }
    }
}

// Función para poblar cursos
async function populateCourses() {
    // Obtener instituciones existentes
    const { data: institutions } = await supabase
        .from('institutions')
        .select('id, name');

    if (!institutions || institutions.length === 0) {
        console.log('⚠️  No hay instituciones, saltando creación de cursos');
        return;
    }

    const coursesData = [
        // Universidad de Chile
        {
            institution: 'Universidad de Chile',
            courses: [
                { name: 'Ingeniería Informática', code: 'ING-INF', level: 'superior', duration_months: 60 },
                { name: 'Medicina', code: 'MED', level: 'superior', duration_months: 84 },
                { name: 'Derecho', code: 'DER', level: 'superior', duration_months: 60 },
                { name: 'Psicología', code: 'PSI', level: 'superior', duration_months: 60 }
            ]
        },
        // PUC
        {
            institution: 'Pontificia Universidad Católica de Chile',
            courses: [
                { name: 'Administración', code: 'ADM', level: 'superior', duration_months: 48 },
                { name: 'Arquitectura', code: 'ARQ', level: 'superior', duration_months: 66 },
                { name: 'Educación', code: 'EDU', level: 'superior', duration_months: 48 }
            ]
        },
        // USACH
        {
            institution: 'Universidad de Santiago de Chile',
            courses: [
                { name: 'Ingeniería en Informática', code: 'ING-INF-US', level: 'superior', duration_months: 60 },
                { name: 'Contador Auditor', code: 'CONT', level: 'superior', duration_months: 48 }
            ]
        },
        // INACAP
        {
            institution: 'INACAP',
            courses: [
                { name: 'Técnico en Informática', code: 'TEC-INF', level: 'tecnico', duration_months: 30 },
                { name: 'Técnico en Administración', code: 'TEC-ADM', level: 'tecnico', duration_months: 30 }
            ]
        },
        // DUOC UC
        {
            institution: 'DUOC UC',
            courses: [
                { name: 'Analista Programador', code: 'ANAP', level: 'tecnico', duration_months: 30 },
                { name: 'Técnico en Contabilidad', code: 'TEC-CONT', level: 'tecnico', duration_months: 24 }
            ]
        }
    ];

    for (const institutionCourses of coursesData) {
        const institution = institutions.find(i => i.name === institutionCourses.institution);
        if (!institution) continue;

        for (const course of institutionCourses.courses) {
            try {
                // Verificar si ya existe
                const { data: existing } = await supabase
                    .from('courses')
                    .select('id')
                    .eq('institution_id', institution.id)
                    .eq('name', course.name)
                    .single();

                if (!existing) {
                    const { error } = await supabase
                        .from('courses')
                        .insert({
                            institution_id: institution.id,
                            ...course,
                            is_active: true
                        });

                    if (error) {
                        console.error(`❌ Error creando curso ${course.name}:`, error.message);
                    } else {
                        console.log(`   ✅ ${course.name} (${institutionCourses.institution}) creado`);
                    }
                } else {
                    console.log(`   ⚠️  ${course.name} ya existe en ${institutionCourses.institution}`);
                }
            } catch (error) {
                console.error(`❌ Error con curso ${course.name}:`, error.message);
            }
        }
    }
}

// Función para poblar configuraciones del sistema
async function populateSystemConfig() {
    const configData = [
        // TRANSFERENCIAS
        {
            config_key: 'max_transfer_amount',
            config_value: '5000000',
            description: 'Monto máximo por transferencia individual (CLP)',
            data_type: 'number',
            category: 'transfers',
            min_value: 1000,
            max_value: 100000000,
            is_editable: true
        },
        {
            config_key: 'max_daily_transfers',
            config_value: '50',
            description: 'Número máximo de transferencias por día por usuario',
            data_type: 'number',
            category: 'transfers',
            min_value: 1,
            max_value: 1000,
            is_editable: true
        },
        {
            config_key: 'daily_transfer_limit',
            config_value: '10000000',
            description: 'Límite diario de dinero a transferir por usuario (CLP)',
            data_type: 'number',
            category: 'transfers',
            min_value: 100000,
            max_value: 1000000000,
            is_editable: true
        },
        {
            config_key: 'min_transfer_amount',
            config_value: '1000',
            description: 'Monto mínimo por transferencia (CLP)',
            data_type: 'number',
            category: 'transfers',
            min_value: 100,
            max_value: 100000,
            is_editable: true
        },

        // USUARIOS
        {
            config_key: 'student_min_age',
            config_value: '15',
            description: 'Edad mínima para estudiantes',
            data_type: 'number',
            category: 'users',
            min_value: 10,
            max_value: 25,
            is_editable: true
        },
        {
            config_key: 'student_max_age',
            config_value: '70',
            description: 'Edad máxima para estudiantes',
            data_type: 'number',
            category: 'users',
            min_value: 18,
            max_value: 100,
            is_editable: true
        },
        {
            config_key: 'teacher_min_age',
            config_value: '22',
            description: 'Edad mínima para docentes',
            data_type: 'number',
            category: 'users',
            min_value: 18,
            max_value: 30,
            is_editable: true
        },
        {
            config_key: 'teacher_max_age',
            config_value: '70',
            description: 'Edad máxima para docentes',
            data_type: 'number',
            category: 'users',
            min_value: 25,
            max_value: 100,
            is_editable: true
        },
        {
            config_key: 'max_courses_per_teacher',
            config_value: '10',
            description: 'Máximo de cursos que puede dictar un docente',
            data_type: 'number',
            category: 'users',
            min_value: 1,
            max_value: 50,
            is_editable: true
        },

        // SEGURIDAD
        {
            config_key: 'max_login_attempts',
            config_value: '5',
            description: 'Intentos máximos de login antes de bloqueo',
            data_type: 'number',
            category: 'security',
            min_value: 3,
            max_value: 20,
            is_editable: true
        },
        {
            config_key: 'lockout_duration_minutes',
            config_value: '15',
            description: 'Minutos de bloqueo tras intentos fallidos',
            data_type: 'number',
            category: 'security',
            min_value: 5,
            max_value: 1440,
            is_editable: true
        },
        {
            config_key: 'session_timeout_hours',
            config_value: '24',
            description: 'Horas de duración de sesión JWT',
            data_type: 'number',
            category: 'security',
            min_value: 1,
            max_value: 168,
            is_editable: true
        },

        // GENERAL
        {
            config_key: 'app_name',
            config_value: 'BANCARIZATE',
            description: 'Nombre de la aplicación',
            data_type: 'string',
            category: 'general',
            is_editable: true
        },
        {
            config_key: 'maintenance_mode',
            config_value: 'false',
            description: 'Modo de mantenimiento activado',
            data_type: 'boolean',
            category: 'general',
            is_editable: true
        }
    ];

    for (const config of configData) {
        try {
            // Verificar si ya existe
            const { data: existing } = await supabase
                .from('system_config')
                .select('id')
                .eq('config_key', config.config_key)
                .single();

            if (!existing) {
                const { error } = await supabase
                    .from('system_config')
                    .insert(config);

                if (error) {
                    console.error(`❌ Error creando configuración ${config.config_key}:`, error.message);
                } else {
                    console.log(`   ✅ ${config.config_key} configurada`);
                }
            } else {
                console.log(`   ⚠️  ${config.config_key} ya existe`);
            }
        } catch (error) {
            console.error(`❌ Error con configuración ${config.config_key}:`, error.message);
        }
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    initAdminTables()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = initAdminTables;