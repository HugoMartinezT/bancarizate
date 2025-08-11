// utils/transferActivityLogger.js - Helper para registrar actividades de transferencias
const supabaseConfig = require('../config/supabase');
const supabase = supabaseConfig.supabase;

/**
 * Registrar actividad de transferencia enviada
 * @param {Object} transferData - Datos de la transferencia
 * @param {string} transferData.senderUserId - ID del usuario que envía
 * @param {string} transferData.recipientUserId - ID del usuario que recibe
 * @param {number} transferData.amount - Monto transferido
 * @param {string} transferData.description - Descripción de la transferencia
 * @param {string} transferData.transferId - ID de la transferencia
 * @param {Object} transferData.senderInfo - Información del remitente
 * @param {Object} transferData.recipientInfo - Información del destinatario
 * @param {Object} req - Request object para obtener IP y User Agent
 */
const logTransferSentActivity = async (transferData, req) => {
  try {
    const {
      senderUserId,
      recipientUserId,
      amount,
      description,
      transferId,
      senderInfo,
      recipientInfo
    } = transferData;

    console.log(`📤 Registrando actividad de transferencia enviada:`);
    console.log(`   Sender: ${senderUserId} -> Recipient: ${recipientUserId}`);
    console.log(`   Amount: $${amount.toLocaleString('es-CL')}`);

    // Registrar actividad para el remitente (transferencia enviada)
    const senderActivityData = {
      user_id: senderUserId,
      action: 'transfer',
      entity_type: 'transfer',
      entity_id: transferId,
      ip_address: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      metadata: {
        amount: amount,
        recipient: `${recipientInfo.first_name} ${recipientInfo.last_name}`,
        recipientName: `${recipientInfo.first_name} ${recipientInfo.last_name}`,
        recipientRun: recipientInfo.run,
        recipientEmail: recipientInfo.email,
        recipientRole: recipientInfo.role,
        description: description,
        transferId: transferId,
        type: 'sent',
        timestamp: new Date().toISOString()
      }
    };

    const { error: senderError } = await supabase
      .from('activity_logs')
      .insert(senderActivityData);

    if (senderError) {
      console.error('❌ Error registrando actividad del remitente:', senderError);
      throw senderError;
    }

    console.log('✅ Actividad de envío registrada correctamente');

    // Registrar actividad para el destinatario (transferencia recibida)
    const recipientActivityData = {
      user_id: recipientUserId,
      action: 'transfer_received',
      entity_type: 'transfer',
      entity_id: transferId,
      ip_address: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      metadata: {
        amount: amount,
        sender: `${senderInfo.first_name} ${senderInfo.last_name}`,
        senderName: `${senderInfo.first_name} ${senderInfo.last_name}`,
        senderRun: senderInfo.run,
        senderEmail: senderInfo.email,
        senderRole: senderInfo.role,
        description: description,
        transferId: transferId,
        type: 'received',
        timestamp: new Date().toISOString()
      }
    };

    const { error: recipientError } = await supabase
      .from('activity_logs')
      .insert(recipientActivityData);

    if (recipientError) {
      console.error('❌ Error registrando actividad del destinatario:', recipientError);
      throw recipientError;
    }

    console.log('✅ Actividad de recepción registrada correctamente');

  } catch (error) {
    console.error('💥 Error en logTransferSentActivity:', error);
    // No lanzamos el error para no afectar la transferencia principal
  }
};

/**
 * Registrar actividad de transferencia múltiple
 * @param {Object} transferData - Datos de la transferencia múltiple
 * @param {Object} req - Request object
 */
const logMultipleTransferActivity = async (transferData, req) => {
  try {
    const {
      senderUserId,
      recipients,
      totalAmount,
      description,
      transferId,
      senderInfo
    } = transferData;

    console.log(`📤 Registrando actividad de transferencia múltiple:`);
    console.log(`   Sender: ${senderUserId}`);
    console.log(`   Recipients: ${recipients.length}`);
    console.log(`   Total Amount: $${totalAmount.toLocaleString('es-CL')}`);

    // Registrar actividad para el remitente
    const senderActivityData = {
      user_id: senderUserId,
      action: 'transfer',
      entity_type: 'transfer',
      entity_id: transferId,
      ip_address: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      metadata: {
        amount: totalAmount,
        recipientCount: recipients.length,
        recipients: recipients.map(r => ({
          name: `${r.first_name} ${r.last_name}`,
          run: r.run,
          amount: r.amount
        })),
        description: description,
        transferId: transferId,
        type: 'multiple_sent',
        timestamp: new Date().toISOString()
      }
    };

    const { error: senderError } = await supabase
      .from('activity_logs')
      .insert(senderActivityData);

    if (senderError) {
      console.error('❌ Error registrando actividad del remitente múltiple:', senderError);
      throw senderError;
    }

    // Registrar actividad para cada destinatario
    for (const recipient of recipients) {
      const recipientActivityData = {
        user_id: recipient.user_id,
        action: 'transfer_received',
        entity_type: 'transfer',
        entity_id: transferId,
        ip_address: req.ip || req.connection.remoteAddress || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        metadata: {
          amount: recipient.amount,
          sender: `${senderInfo.first_name} ${senderInfo.last_name}`,
          senderName: `${senderInfo.first_name} ${senderInfo.last_name}`,
          senderRun: senderInfo.run,
          senderEmail: senderInfo.email,
          senderRole: senderInfo.role,
          description: description,
          transferId: transferId,
          type: 'received_from_multiple',
          isPartOfMultiple: true,
          timestamp: new Date().toISOString()
        }
      };

      const { error: recipientError } = await supabase
        .from('activity_logs')
        .insert(recipientActivityData);

      if (recipientError) {
        console.error(`❌ Error registrando actividad para destinatario ${recipient.user_id}:`, recipientError);
      } else {
        console.log(`✅ Actividad registrada para destinatario: ${recipient.first_name} ${recipient.last_name}`);
      }
    }

    console.log('✅ Todas las actividades de transferencia múltiple registradas');

  } catch (error) {
    console.error('💥 Error en logMultipleTransferActivity:', error);
  }
};

/**
 * Registrar actividad de transferencia fallida
 * @param {Object} failedTransferData - Datos de la transferencia fallida
 * @param {Object} req - Request object
 */
const logFailedTransferActivity = async (failedTransferData, req) => {
  try {
    const {
      senderUserId,
      amount,
      recipientInfo,
      error,
      reason
    } = failedTransferData;

    console.log(`❌ Registrando actividad de transferencia fallida:`);
    console.log(`   Sender: ${senderUserId}`);
    console.log(`   Reason: ${reason}`);

    const activityData = {
      user_id: senderUserId,
      action: 'transfer_failed',
      entity_type: 'transfer',
      entity_id: null,
      ip_address: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      metadata: {
        amount: amount,
        recipient: recipientInfo ? `${recipientInfo.first_name} ${recipientInfo.last_name}` : 'Unknown',
        recipientRun: recipientInfo?.run,
        error: error,
        reason: reason,
        timestamp: new Date().toISOString()
      }
    };

    const { error: logError } = await supabase
      .from('activity_logs')
      .insert(activityData);

    if (logError) {
      console.error('❌ Error registrando actividad de transferencia fallida:', logError);
    } else {
      console.log('✅ Actividad de transferencia fallida registrada');
    }

  } catch (error) {
    console.error('💥 Error en logFailedTransferActivity:', error);
  }
};

module.exports = {
  logTransferSentActivity,
  logMultipleTransferActivity,
  logFailedTransferActivity
};