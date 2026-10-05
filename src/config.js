import dotenv from 'dotenv';
dotenv.config();

const requiredEnvs = [
  'TELEGRAM_BOT_TOKEN',
  'GEMINI_API_KEY',
  'ALLOWED_USER_IDS',
  'GOOGLE_CALENDAR_ID',
  'WEBHOOK_DOMAIN',
];

for (const envName of requiredEnvs) {
  if (!process.env[envName]) {
    console.error(`FATAL: Missing environment variable "${envName}". Check your .env file.`);
    process.exit(1);
  }
}

export const config = {
  port: process.env.PORT || 3000,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  geminiApiKey: process.env.GEMINI_API_KEY,
  allowedUserIds: process.env.ALLOWED_USER_IDS.split(',').map((id) => Number(id.trim())),
  calendarId: process.env.GOOGLE_CALENDAR_ID,
  googleCredentialsPath: './google-credentials.json',
  webhookDomain: process.env.WEBHOOK_DOMAIN.replace(/\/+$/, ''), // strip any trailing slash
  webhookSecret: process.env.WEBHOOK_SECRET || 'super_secret_webhook_token_12345',
};