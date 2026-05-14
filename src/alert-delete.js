// src/commands/alert-delete.js  (/알림삭제)
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { deleteAlertByIdAndUser } = require('../services/alertService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('알림삭제')
    .setDescription('설정한 가격 알림을 취소합니다.')
    .addIntegerOption((option) =>
      option
        .setName('알림id')
        .setDescription('삭제할 알림 ID (/알림목록에서 확인)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: '❌ 이 명령어는 서버 채널에서만 사용할 수 있습니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const alertId = interaction.options.getInteger('알림id');
    const userId  = interaction.user.id;
    const guildId = interaction.guildId;

    let result;
    try {
      result = await deleteAlertByIdAndUser(alertId, userId, guildId);
    } catch (err) {
      console.error('[알림삭제] 삭제 오류:', err);
      return interaction.editReply({ content: '❌ 알림 삭제 중 오류가 발생했습니다.' });
    }

    if (!result.deleted) {
      return interaction.editReply({
        content: `❌ ID \`${alertId}\` 에 해당하는 알림을 찾을 수 없습니다.\n본인이 이 서버에서 등록한 알림만 삭제할 수 있습니다.`,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🗑️ 알림 삭제 완료')
      .setColor(0xed4245)
      .setDescription(`ID \`${alertId}\` 알림이 삭제되었습니다.`)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
