import express from 'express';
import { bot } from './bot.js';
import { config } from './config.js';

const app = express();

// Health check endpoint for uptime monitoring services
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

async function startWebhookServer() {
  const webhookPath = `/webhook/${config.telegramToken.slice(0, 10)}`;

  // Secret token verification middleware
  app.use(
    bot.webhookCallback(webhookPath, {
      secretToken: config.webhookSecret,
    })
  );

  app.listen(config.port, async () => {
    console.log(`Express server running on port ${config.port}`);

    try {
      const targetUrl = `${config.webhookDomain}${webhookPath}`;
      console.log(`Registering Telegram Webhook with secret token to: ${targetUrl}`);

      await bot.telegram.setWebhook(targetUrl, {
        secret_token: config.webhookSecret,
        drop_pending_updates: true,
      });

      console.log('Webhook registered with Telegram.');
    } catch (err) {
      console.error('Failed to set Telegram webhook:', err.message);
    }
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down cleanly...`);
    bot.stop(signal);
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startWebhookServer().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});