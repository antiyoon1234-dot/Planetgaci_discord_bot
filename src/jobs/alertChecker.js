// src/jobs/alertChecker.js
'use strict';

const { EmbedBuilder } = require('discord.js');
const supabase = require('../services/supabase');
const { getPendingAlerts, markAlertAsNotified } = require('../services/alertService');
const { formatPrice, formatDate } = require('../services/itemService');

const INTERVAL_MS = 60 * 1000; // 1분

/**
 * 현재 가격이 target_price 이하인 알림을 찾아 DM 발송
 * @param {import('discord.js').Client} client
 */
async function runAlertCheck(client) {
  console.log(`[AlertChecker] 알림 체크 시작 - ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  // 1. 미발송 알림 전체 조회
  let alerts;
  try {
    alerts = await getPendingAlerts();
  } catch (err) {
    console.error('[AlertChecker] 알림 목록 조회 실패:', err.message);
    return;
  }

  if (alerts.length === 0) {
    console.log('[AlertChecker] 대기 중인 알림 없음');
    return;
  }

  console.log(`[AlertChecker] 대기 알림 ${alerts.length}개 처리 시작`);

  // 2. 중복 item_name 처리를 위해 items를 한 번에 배치 조회
  const uniqueItemNames = [...new Set(alerts.map((a) => a.item_name))];

  let itemsData;
  try {
    const { data, error } = await supabase
      .from('items')
      .select('name, current_value, last_modified, unit_type')
      .in('name', uniqueItemNames)
      .eq('status', 'approved');

    if (error) throw new Error(error.message);
    itemsData = data ?? [];
  } catch (err) {
    console.error('[AlertChecker] 아이템 배치 조회 실패:', err.message);
    return;
  }

  // name → item 매핑
  const itemMap = new Map(itemsData.map((item) => [item.name, item]));

  // 3. 각 알림 처리
  for (const alert of alerts) {
    const item = itemMap.get(alert.item_name);

    // 아이템이 DB에 없으면 스킵 (이름 변경 등 예외 상황)
    if (!item) {
      console.warn(`[AlertChecker] 아이템 없음: "${alert.item_name}" (alert_id: ${alert.id})`);
      continue;
    }

    // 가격 조건 미충족 시 스킵
    if (item.current_value === null || item.current_value > alert.target_price) {
      continue;
    }

    console.log(
      `[AlertChecker] 조건 충족! alert_id=${alert.id}, user_id=${alert.user_id}, ` +
      `item="${item.name}", current=${item.current_value}, target=${alert.target_price}`
    );

    // 4. DM 발송
    let dmSent = false;
    try {
      const user = await client.users.fetch(alert.user_id);
      const embed = buildDmEmbed(item, alert);
      await user.send({ embeds: [embed] });
      dmSent = true;
      console.log(`[AlertChecker] DM 발송 완료 → user: ${user.tag}`);
    } catch (err) {
      // DM 차단, 유저 없음 등
      console.error(`[AlertChecker] DM 발송 실패 (user_id: ${alert.user_id}):`, err.message);
    }

    // 5. DM 성공 여부와 무관하게 알림 삭제 (중복 방지)
    //    DM 실패했더라도 반복 시도 시 스팸이 될 수 있으므로 삭제
    //    운영 정책에 따라 dmSent 조건 추가 가능
    try {
      await markAlertAsNotified(alert.id);
    } catch (err) {
      console.error(`[AlertChecker] 알림 삭제 실패 (alert_id: ${alert.id}):`, err.message);
    }
  }

  console.log('[AlertChecker] 알림 체크 완료');
}

/**
 * DM 임베드 빌더
 */
function buildDmEmbed(item, alert) {
  return new EmbedBuilder()
    .setTitle('🔔 가격 알림 도달!')
    .setColor(0xed4245)
    .setDescription(
      `**${item.name}** 의 가격이 목표가에 도달했습니다!`
    )
    .addFields(
      { name: '🎯 목표 가격', value: `${alert.target_price.toLocaleString('ko-KR')} 코인`, inline: true },
      { name: '💰 현재 가격', value: formatPrice(item.current_value, item.unit_type), inline: true },
      { name: '🕒 업데이트 시간', value: formatDate(item.last_modified), inline: false }
    )
    .setFooter({ text: 'PlanetGachi 가격 알림 • 알림은 자동으로 삭제됩니다.' })
    .setTimestamp();
}

/**
 * 알림 체커를 1분마다 반복 실행
 * @param {import('discord.js').Client} client
 */
function startAlertChecker(client) {
  // 봇 시작 후 30초 뒤 첫 실행 (봇 초기화 대기)
  setTimeout(() => {
    runAlertCheck(client);
    setInterval(() => runAlertCheck(client), INTERVAL_MS);
  }, 30_000);

  console.log('[AlertChecker] 알림 체커 등록 완료 (30초 후 첫 실행, 이후 1분 간격)');
}

module.exports = { startAlertChecker };
