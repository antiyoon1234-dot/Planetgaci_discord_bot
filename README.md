# PlanetGachi Discord Bot

PlanetGachi 아이템 가격 조회 및 알림 디스코드 봇

---

## 📋 슬래시 커맨드

| 커맨드 | 설명 |
|---|---|
| `/가격조회 [아이템명]` | 아이템 현재 가격 조회 (부분 검색, 최대 5개) |
| `/알림설정 [아이템명] [목표가격]` | 목표가 이하 도달 시 DM 알림 등록 |
| `/알림목록` | 내가 설정한 알림 전체 조회 |
| `/알림삭제 [알림ID]` | 특정 알림 취소 |

---

## 🛠 사전 준비

### 1. Discord 봇 생성

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. **Bot** 탭 → **Add Bot**
3. `TOKEN` 복사 → `.env`의 `DISCORD_TOKEN`
4. `APPLICATION ID` 복사 → `.env`의 `DISCORD_CLIENT_ID`
5. **Bot Permissions** 체크:
   - `Send Messages`
   - `Use Slash Commands`
   - `Send Messages in Threads`
6. **Privileged Gateway Intents**:
   - `MESSAGE CONTENT INTENT` ← DM 발송에 필요
7. 초대 URL 생성: `OAuth2` → `URL Generator`
   - Scope: `bot`, `applications.commands`
   - 권한: `Send Messages`, `Use Slash Commands`

### 2. 서버 ID (Guild ID) 확인

Discord 앱 → 설정 → 고급 → **개발자 모드 ON**  
서버 아이콘 우클릭 → **서버 ID 복사** → `.env`의 `DISCORD_GUILD_ID`

---

## 🚀 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
vi .env   # 값 입력

# 3. 슬래시 커맨드 Discord 서버에 등록 (최초 1회, 변경 시마다 재실행)
npm run deploy

# 4. 봇 실행
npm start
```

---

## ⚙️ 환경변수 (.env)

| 변수명 | 설명 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_KEY` | Supabase anon key 또는 service_role key |
| `DISCORD_TOKEN` | 봇 토큰 |
| `DISCORD_CLIENT_ID` | 애플리케이션 Client ID |
| `DISCORD_GUILD_ID` | 슬래시 커맨드 등록할 서버 ID (없으면 글로벌 등록) |

> `DISCORD_GUILD_ID` 설정 시 해당 서버에만 즉시 반영됩니다.  
> 미설정 시 글로벌 등록으로 반영까지 최대 1시간 소요됩니다.

---

## 🗄 DB 테이블

### `items` (기존)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigint | PK |
| `name` | text | 아이템명 |
| `current_value` | integer | 현재 가격 (코인) |
| `last_modified` | timestamptz | 마지막 가격 업데이트 |
| `unit_type` | text | `piece` / `set` / `stack` / `shulker` |
| `status` | text | `approved` 인 것만 조회 |

### `discord_alerts` (신규)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigserial | PK |
| `user_id` | text | 디스코드 유저 ID |
| `item_name` | text | 아이템명 |
| `target_price` | integer | 목표 가격 |
| `notified` | boolean | 발송 여부 (현재 미사용, 삭제 방식으로 처리) |
| `created_at` | timestamptz | 등록 시각 |

---

## 🏗 프로젝트 구조

```
src/
├── commands/
│   ├── 가격조회.js       # /가격조회
│   ├── 알림설정.js       # /알림설정
│   ├── 알림목록.js       # /알림목록
│   └── 알림삭제.js       # /알림삭제
├── services/
│   ├── supabase.js       # Supabase 클라이언트 싱글턴
│   ├── itemService.js    # 아이템 조회 + 포맷 유틸
│   └── alertService.js   # 알림 CRUD
├── jobs/
│   └── alertChecker.js   # 1분 주기 가격 체크 & DM 발송
├── deploy-commands.js    # 슬래시 커맨드 Discord 등록
└── index.js              # 봇 진입점
```

---

## 🔄 자동 알림 흐름

```
[1분마다]
alertChecker.js
  └─ discord_alerts 테이블에서 미발송 알림 전체 조회
  └─ 관련 items 배치 조회 (N+1 방지)
  └─ current_value <= target_price 이면:
       └─ client.users.fetch(user_id) → user.send(embed)
       └─ discord_alerts 행 삭제 (중복 발송 방지)
```

---

## 🔧 운영 (PM2 권장)

```bash
npm install -g pm2

# 시작
pm2 start src/index.js --name planetgachi-bot

# 재시작 설정 (서버 재부팅 시 자동 시작)
pm2 startup
pm2 save

# 로그 확인
pm2 logs planetgachi-bot
```
