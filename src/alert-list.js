// src/commands/alert-list.js  (/알림목록)
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAlerts } = require('../services/alertService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('알림목록')
    .setDescription('이 서버에서 내가 설정한 가격 알림 목록을 확인합니다.'),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: '❌ 이 명령어는 서버 채널에서만 사용할 수 있습니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const userId  = interaction.user.id;
    const guildId = interaction.guildId;

    let alerts;
    try {
      alerts = await getUserAlerts(guildId, userId);
    } catch (err) {
      console.error('[알림목록] DB 조회 오류:', err);
      return interaction.editReply({ content: '❌ 알림 목록 조회 중 오류가 발생했습니다.' });
    }

    if (alerts.length === 0) {
      return interaction.editReply({ content: '📭 이 서버에 설정된 알림이 없습니다.\n`/알림설정` 명령어로 알림을 추가해보세요!' });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔔 내 알림 목록')
      .setColor(0x5865f2)
      .setDescription(`이 서버에 **${alerts.length}개**의 알림이 설정되어 있습니다.`)
      .setFooter({ text: '알림 취소: /알림삭제 [ID]' })
      .setTimestamp();

    for (const alert of alerts) {
      const registeredAt = new Date(alert.created_at).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      embed.addFields({
        name: `ID: \`${alert.id}\` · ${alert.item_name}`,
        value: `🎯 목표가: **${alert.target_price.toLocaleString('ko-KR')} 코인** · 등록: ${registeredAt}`,
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
