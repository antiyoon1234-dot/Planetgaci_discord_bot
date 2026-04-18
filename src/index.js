// src/index.js
'use strict';

require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { startAlertChecker } = require('./jobs/alertChecker');

// ──────────────────────────────────────────────────────────────
// 환경변수 검증
// ──────────────────────────────────────────────────────────────
const { DISCORD_TOKEN, DISCORD_CLIENT_ID, SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!DISCORD_TOKEN) throw new Error('환경변수 DISCORD_TOKEN이 없습니다.');
if (!DISCORD_CLIENT_ID) throw new Error('환경변수 DISCORD_CLIENT_ID가 없습니다.');
if (!SUPABASE_URL) throw new Error('환경변수 SUPABASE_URL이 없습니다.');
if (!SUPABASE_KEY) throw new Error('환경변수 SUPABASE_KEY가 없습니다.');

// ──────────────────────────────────────────────────────────────
// Discord 클라이언트 초기화
// ──────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,          // 서버 이벤트
    GatewayIntentBits.DirectMessages,  // DM 발송
  ],
});

// ──────────────────────────────────────────────────────────────
// 슬래시 커맨드 동적 로드
// ──────────────────────────────────────────────────────────────
client.commands = new Collection();

const commandsDir = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsDir, file));

  if (!command.data || !command.execute) {
    console.warn(`[Commands] ${file} 에 data 또는 execute가 없습니다. 스킵.`);
    continue;
  }

  client.commands.set(command.data.name, command);
  console.log(`[Commands] 로드: /${command.data.name}`);
}

// ──────────────────────────────────────────────────────────────
// 이벤트: 봇 준비
// ──────────────────────────────────────────────────────────────
client.once(Events.ClientReady, (readyClient) => {
  console.log(`\n✅ 봇 로그인 완료: ${readyClient.user.tag}`);
  console.log(`📋 로드된 커맨드: ${[...client.commands.keys()].map((n) => `/${n}`).join(', ')}`);

  // 알림 체커 시작
  startAlertChecker(client);
});

// ──────────────────────────────────────────────────────────────
// 이벤트: 슬래시 커맨드 처리
// ──────────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`[Interaction] 알 수 없는 커맨드: /${interaction.commandName}`);
    await interaction.reply({
      content: '❌ 알 수 없는 명령어입니다.',
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Interaction] /${interaction.commandName} 실행 중 오류:`, err);

    const errorMsg = { content: '❌ 명령어 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', ephemeral: true };

    // deferReply 여부에 따라 분기
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
});

// ──────────────────────────────────────────────────────────────
// 프로세스 예외 처리
// ──────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  // 치명적 에러는 프로세스 종료 (PM2/systemd 자동 재시작 권장)
  process.exit(1);
});

// ──────────────────────────────────────────────────────────────
// 봇 로그인
// ──────────────────────────────────────────────────────────────
client.login(DISCORD_TOKEN);
