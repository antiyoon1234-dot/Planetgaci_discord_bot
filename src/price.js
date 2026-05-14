// src/commands/price.js  (/가격조회)
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchItems, formatPrice, formatDate } = require('../services/itemService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('가격조회')
    .setDescription('아이템의 현재 가격을 조회합니다.')
    .addStringOption((option) =>
      option
        .setName('아이템명')
        .setDescription('조회할 아이템 이름 (일부 입력 가능)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(50)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString('아이템명');

    let items;
    try {
      items = await searchItems(query);
    } catch (err) {
      console.error('[가격조회] DB 오류:', err);
      return interaction.editReply({ content: '❌ 데이터베이스 조회 중 오류가 발생했습니다.' });
    }

    if (items.length === 0) {
      return interaction.editReply({ content: `❌ \`${query}\` 에 해당하는 아이템을 찾을 수 없습니다.` });
    }

    const embed = new EmbedBuilder()
      .setTitle('📦 아이템 가격 조회')
      .setColor(0x5865f2)
      .setDescription(`\`${query}\` 검색 결과 (${items.length}개)`)
      .setFooter({ text: 'PlanetGachi 가격 정보' })
      .setTimestamp();

    for (const item of items) {
      embed.addFields({
        name: `🔹 ${item.name}`,
        value: [
          `💰 **현재 가격:** ${formatPrice(item.current_value, item.unit_type)}`,
          `🕒 **마지막 업데이트:** ${formatDate(item.last_modified)}`,
        ].join('\n'),
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
