// src/services/alertService.js
'use strict';

const supabase = require('./supabase');

/**
 * 알림 등록 (길드별 중복 방지)
 * @param {string} guildId  디스코드 서버 ID
 * @param {string} userId   디스코드 유저 ID
 * @param {string} itemName
 * @param {number} targetPrice
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function createAlert(guildId, userId, itemName, targetPrice) {
  const { data, error } = await supabase
    .from('discord_alerts')
    .insert({
      guild_id: guildId,
      user_id: userId,
      item_name: itemName,
      target_price: targetPrice,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: '이 서버에서 이미 동일한 알림이 설정되어 있습니다.' };
    }
    throw new Error(`[alertService] 알림 저장 오류: ${error.message}`);
  }

  return { success: true, message: `알림이 등록되었습니다. (ID: ${data.id})` };
}

/**
 * 특정 길드 + 유저의 알림 목록 조회
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserAlerts(guildId, userId) {
  const { data, error } = await supabase
    .from('discord_alerts')
    .select('id, item_name, target_price, created_at')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .eq('notified', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[alertService] 알림 조회 오류: ${error.message}`);
  return data ?? [];
}

/**
 * 미발송 알림 전체 조회 (체커 전용, 전체 길드)
 * @returns {Promise<Array>}
 */
async function getPendingAlerts() {
  const { data, error } = await supabase
    .from('discord_alerts')
    .select('id, guild_id, user_id, item_name, target_price')
    .eq('notified', false)
    .order('id', { ascending: true });

  if (error) throw new Error(`[alertService] 펜딩 알림 조회 오류: ${error.message}`);
  return data ?? [];
}

/**
 * 알림 발송 완료 → 행 삭제 (중복 발송 방지)
 * @param {number} alertId
 */
async function markAlertAsNotified(alertId) {
  const { error } = await supabase
    .from('discord_alerts')
    .delete()
    .eq('id', alertId);

  if (error) throw new Error(`[alertService] 알림 삭제 오류: ${error.message}`);
}

/**
 * 유저 본인의 알림을 ID + 길드 기준으로 삭제 (타인/타 서버 알림 삭제 방지)
 * @param {number}  alertId
 * @param {string}  userId
 * @param {string}  guildId
 * @returns {Promise<{deleted: boolean}>}
 */
async function deleteAlertByIdAndUser(alertId, userId, guildId) {
  const { data, error } = await supabase
    .from('discord_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', userId)
    .eq('guild_id', guildId)
    .eq('notified', false)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`[alertService] 알림 삭제 오류: ${error.message}`);
  return { deleted: data !== null };
}

module.exports = {
  createAlert,
  getUserAlerts,
  getPendingAlerts,
  markAlertAsNotified,
  deleteAlertByIdAndUser,
};
