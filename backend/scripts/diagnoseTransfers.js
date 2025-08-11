// scripts/diagnoseTransfers.js - Diagnóstico MEJORADO que detecta correctamente
const { supabase } = require('../config/supabase');

const diagnoseTransfers = async () => {
  console.log('🔍 DIAGNÓSTICO MEJORADO DE TRANSFERENCIAS');
  console.log('=========================================\n');

  try {
    // Consultar las 5 actividades de transferencia más recientes
    const { data: activities, error } = await supabase
      .from('activity_logs')
      .select(`
        id,
        action,
        metadata,
        created_at,
        users:user_id (
          run,
          first_name,
          last_name
        )
      `)
      .in('action', ['transfer', 'transfer_sent', 'transfer_received'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (activities.length === 0) {
      console.log('⚠️  No hay actividades de transferencia');
      console.log('💡 Haz una transferencia primero y luego ejecuta este script\n');
      return;
    }

    console.log(`✅ Encontradas ${activities.length} actividades de transferencia\n`);

    let hasNewFormat = false;
    let hasOldFormat = false;

    activities.forEach((activity, index) => {
      console.log(`📊 ACTIVIDAD ${index + 1}:`);
      console.log(`   Acción: ${activity.action}`);
      console.log(`   Usuario: ${activity.users?.first_name} ${activity.users?.last_name}`);
      console.log(`   Fecha: ${new Date(activity.created_at).toLocaleString('es-CL')}`);
      
      if (activity.metadata) {
        console.log(`   ✅ METADATA DISPONIBLE:`);
        console.log(`      Keys: [${Object.keys(activity.metadata).join(', ')}]`);
        
        const meta = activity.metadata;
        
        // Verificar FORMATO NUEVO vs FORMATO VIEJO
        const hasRecipientName = meta.recipient || meta.recipientName || meta.sender || meta.senderName;
        const hasRecipientArray = meta.recipients && Array.isArray(meta.recipients) && meta.recipients.length > 0 && meta.recipients[0].name;
        const isNewFormat = hasRecipientName || hasRecipientArray;
        const isOldFormat = meta.recipients && typeof meta.recipients === 'number';
        
        if (isNewFormat) {
          console.log(`      ✅ FORMATO NUEVO DETECTADO`);
          hasNewFormat = true;
        } else if (isOldFormat) {
          console.log(`      ❌ FORMATO VIEJO DETECTADO`);
          hasOldFormat = true;
        }
        
        // Mostrar valores específicos
        if (meta.amount) console.log(`      💰 amount: ${meta.amount}`);
        if (meta.description) console.log(`      📝 description: "${meta.description}"`);
        
        // NUEVOS CAMPOS (formato corregido)
        if (meta.recipient) console.log(`      👤 recipient: "${meta.recipient}"`);
        if (meta.recipientName) console.log(`      👤 recipientName: "${meta.recipientName}"`);
        if (meta.recipientRun) console.log(`      🆔 recipientRun: "${meta.recipientRun}"`);
        if (meta.sender) console.log(`      👤 sender: "${meta.sender}"`);
        if (meta.senderName) console.log(`      👤 senderName: "${meta.senderName}"`);
        if (meta.senderRun) console.log(`      🆔 senderRun: "${meta.senderRun}"`);
        
        // ARRAYS (formato corregido)
        if (meta.recipients && Array.isArray(meta.recipients)) {
          console.log(`      📋 recipients (array): ${JSON.stringify(meta.recipients, null, 6)}`);
        } else if (meta.recipients && typeof meta.recipients === 'number') {
          console.log(`      ❌ recipients (número viejo): ${meta.recipients}`);
        }
        
        // OTROS CAMPOS NUEVOS
        if (meta.recipientCount) console.log(`      🔢 recipientCount: ${meta.recipientCount}`);
        if (meta.transferType) console.log(`      🏷️ transferType: ${meta.transferType}`);
        
        console.log(`      📄 Metadata completa:`, JSON.stringify(meta, null, 6));
        
      } else {
        console.log(`   ❌ NO HAY METADATA`);
      }
      
      console.log('   ' + '='.repeat(60));
    });

    // Análisis mejorado
    console.log('\n🎯 ANÁLISIS DETALLADO:');
    console.log(`📊 Actividades en formato NUEVO: ${activities.filter(a => {
      if (!a.metadata) return false;
      const meta = a.metadata;
      const hasRecipientName = meta.recipient || meta.recipientName || meta.sender || meta.senderName;
      const hasRecipientArray = meta.recipients && Array.isArray(meta.recipients) && meta.recipients.length > 0 && meta.recipients[0].name;
      return hasRecipientName || hasRecipientArray;
    }).length}/${activities.length}`);
    
    console.log(`📊 Actividades en formato VIEJO: ${activities.filter(a => {
      if (!a.metadata) return false;
      const meta = a.metadata;
      return meta.recipients && typeof meta.recipients === 'number';
    }).length}/${activities.length}`);

    if (hasNewFormat && !hasOldFormat) {
      console.log('\n✅ ¡PERFECTO! Todas las actividades usan el formato NUEVO');
      console.log('   Los nombres de destinatarios deberían aparecer en el frontend');
    } else if (hasOldFormat && !hasNewFormat) {
      console.log('\n❌ PROBLEMA: Todas las actividades usan el formato VIEJO');
      console.log('   ➡️  El código NO se actualizó correctamente');
      console.log('   ➡️  O el servidor NO se reinició');
      console.log('   ➡️  O NO se ha hecho una transferencia NUEVA después del cambio');
    } else if (hasNewFormat && hasOldFormat) {
      console.log('\n🔄 MIXTO: Hay actividades en ambos formatos');
      console.log('   ➡️  El código se actualizó correctamente');
      console.log('   ➡️  Las actividades nuevas SÍ tienen nombres');
      console.log('   ➡️  Las actividades viejas NO tienen nombres (normal)');
    } else {
      console.log('\n❓ Estado desconocido');
    }

    console.log('\n💡 PRÓXIMOS PASOS:');
    if (!hasNewFormat) {
      console.log('   1. ✅ Verificar que actualizaste el transferController.js');
      console.log('   2. ✅ Reiniciar el servidor (Ctrl+C, luego npm run dev)');
      console.log('   3. ✅ Hacer una NUEVA transferencia');
      console.log('   4. ✅ Ejecutar este diagnóstico de nuevo');
    } else {
      console.log('   1. ✅ Ir al frontend y ver la página de Actividades');
      console.log('   2. ✅ Los nombres deberían aparecer en las transferencias nuevas');
    }

  } catch (error) {
    console.error('💥 Error en diagnóstico:', error);
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  diagnoseTransfers()
    .then(() => {
      console.log('\n✅ Diagnóstico completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = diagnoseTransfers;