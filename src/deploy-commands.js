// src/deploy-commands.js
'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs   = require('node:fs');
const path = require('node:path');

const token    = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId  = process.env.DISCORD_GUILD_ID; // 없으면 글로벌 등록

if (!token)    throw new Error('환경변수 DISCORD_TOKEN이 없습니다.');
if (!clientId) throw new Error('환경변수 DISCORD_CLIENT_ID가 없습니다.');

// commands 폴더 내 모든 .js 파일 로드
const commandsDir  = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));
const commands     = commandFiles.map((file) => require(path.join(commandsDir, file)).data.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`슬래시 커맨드 ${commands.length}개 등록 시작...`);
    console.log('커맨드:', commands.map((c) => `/${c.name}`).join(', '));

    let data;

    if (guildId) {
      // ── 특정 길드 한정 등록 (즉시 반영, 테스트용) ──────────────────
      data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`✅ 길드(${guildId}) 한정 등록 완료: ${data.length}개`);
    } else {
      // ── 글로벌 등록 (전체 서버, 반영까지 최대 1시간) ──────────────
      data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`✅ 글로벌 등록 완료: ${data.length}개 (반영까지 최대 1시간 소요)`);
    }
  } catch (err) {
    console.error('커맨드 등록 실패:', err);
    process.exit(1);
  }
})();
