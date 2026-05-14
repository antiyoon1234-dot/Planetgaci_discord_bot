// src/commands/alert-set.js  (/알림설정)
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getItemByName, formatPrice } = require('../services/itemService');
const { createAlert } = require('../services/alertService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('알림설정')
    .setDescription('아이템 가격이 목표가 이하로 떨어지면 DM으로 알려드립니다.')
    .addStringOption((option) =>
      option
        .setName('아이템명')
        .setDescription('알림을 설정할 아이템 이름 (정확히 입력)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(50)
    )
    .addIntegerOption((option) =>
      option
        .setName('목표가격')
        .setDescription('이 가격 이하가 되면 알림을 보냅니다 (코인, 양수)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: '❌ 이 명령어는 서버 채널에서만 사용할 수 있습니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const itemName    = interaction.options.getString('아이템명');
    const targetPrice = interaction.options.getInteger('목표가격');
    const userId      = interaction.user.id;
    const guildId     = interaction.guildId;

    let item;
    try {
      item = await getItemByName(itemName);
    } catch (err) {
      console.error('[알림설정] 아이템 조회 오류:', err);
      return interaction.editReply({ content: '❌ DB 오류가 발생했습니다.' });
    }

    if (!item) {
      return interaction.editReply({
        content: `❌ \`${itemName}\` 아이템을 찾을 수 없습니다.\n\`/가격조회\` 로 정확한 아이템명을 확인해주세요.`,
      });
    }

    if (item.current_value !== null && item.current_value <= targetPrice) {
      const warnEmbed = new EmbedBuilder()
        .setTitle('⚠️ 이미 목표 가격 이하입니다!')
        .setColor(0xffa500)
        .setDescription(
          `**${item.name}** 의 현재 가격은 **${formatPrice(item.current_value, item.unit_type)}** 으로,\n` +
          `목표가 **${targetPrice.toLocaleString('ko-KR')} 코인** 보다 이미 낮거나 같습니다.\n\n` +
          `그래도 등록하면 다음 가격 업데이트 시 알림이 발송됩니다.`
        );
      await interaction.editReply({ embeds: [warnEmbed] });
    }

    let result;
    try {
      result = await createAlert(guildId, userId, item.name, targetPrice);
    } catch (err) {
      console.error('[알림설정] 알림 저장 오류:', err);
      return interaction.editReply({ content: '❌ 알림 등록 중 오류가 발생했습니다.' });
    }

    if (!result.success) {
      return interaction.editReply({ content: `⚠️ ${result.message}` });
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ 알림 설정 완료')
      .setColor(0x57f287)
      .addFields(
        { name: '아이템',    value: item.name,                                                                               inline: true },
        { name: '목표 가격', value: `${targetPrice.toLocaleString('ko-KR')} 코인`,                                          inline: true },
        { name: '현재 가격', value: item.current_value != null ? formatPrice(item.current_value, item.unit_type) : '정보 없음', inline: true },
      )
      .setDescription('현재 가격이 목표가 이하로 내려가면 **DM**으로 알려드립니다.')
      .setFooter({ text: 'DM 수신이 차단된 경우 알림이 전송되지 않을 수 있습니다.' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
