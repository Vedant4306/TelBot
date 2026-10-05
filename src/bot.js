import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { runAgentConversation } from './services/agent.js';

export const bot = new Telegraf(config.telegramToken);

// ─── START & HELP COMMANDS ───────────────────────────────────────────────────
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const isOwner = config.allowedUserIds.includes(userId);

  if (isOwner) {
    await ctx.reply(
      `Hello Vedant! I am your personal scheduling assistant. You have full access to your calendar details.`
    );
  } else {
    await ctx.reply(
      `Hello ${ctx.from.first_name}! I am Vedant's AI scheduling assistant. You can ask me when he is free for a call or meeting.`
    );
  }
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    "Ask me about Vedant's availability!\n\n" +
    "Examples:\n" +
    "• Is Vedant free tomorrow afternoon?\n" +
    "• When is a good time to meet this Thursday?\n" +
    "• What does his schedule look like on Friday?"
  );
});

// ─── NATURAL LANGUAGE CHAT HANDLER ──────────────────────────────────────────
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userText = ctx.message.text;

  // Visual indicator in Telegram: "typing..."
  await ctx.sendChatAction('typing');

  try {
    const aiResponse = await runAgentConversation(userText, userId);
    await ctx.reply(aiResponse);
  } catch (error) {
    console.error(`Error processing message for user ${userId}:`, error);
    await ctx.reply("Sorry, I encountered an issue checking the schedule. Please try again shortly.");
  }
});