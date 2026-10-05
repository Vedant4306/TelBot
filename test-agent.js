import { runAgentConversation } from './src/services/agent.js';

async function testGuest() {
  console.log('--- TESTING GUEST ACCESS ---');
  // Pass a fake Telegram user ID that is NOT in ALLOWED_USER_IDS
  const guestUserId = 999999999;
  const query = "What does Vedant's schedule look like tomorrow afternoon?";

  const reply = await runAgentConversation(query, guestUserId);
  console.log('\n--- GUEST RESPONSE ---');
  console.log(reply);
}

testGuest();