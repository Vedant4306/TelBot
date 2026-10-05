import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config.js';
import { getCalendarEvents, resolveDateRange } from './calendar.js';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const calendarToolDeclaration = {
  name: 'getCalendarEvents',
  description: "Fetches scheduled events from Vedant's calendar for a given timeframe.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      timeframe: {
        type: Type.STRING,
        description: "Target day: 'today', 'tomorrow', or a specific date in 'YYYY-MM-DD' format.",
      },
    },
    required: ['timeframe'],
  },
};

const tools = {
  getCalendarEvents: async (args, isOwner) => {
    const { timeMin, timeMax, dateFormatted } = resolveDateRange(args.timeframe);
    console.log(`[CALENDAR QUERY] Range: ${args.timeframe} -> ${timeMin} to ${timeMax}`);

    const rawEvents = await getCalendarEvents(timeMin, timeMax);

    const filtered = rawEvents.map((ev) => ({
      start: ev.start,
      end: ev.end,
      summary: isOwner ? ev.summary : 'BUSY',
    }));

    return {
      queryDate: dateFormatted,
      timeframe: args.timeframe,
      events: filtered,
    };
  },
};

async function generateWithFallback(payload, models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite']) {
  let lastError;
  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await ai.models.generateContent({ model, ...payload });
      } catch (err) {
        lastError = err;
        if (err.status === 503 || err.status === 429) {
          console.warn(`[WARN] Model ${model} busy (attempt ${attempt}/2). Retrying in 1.5s...`);
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          break;
        }
      }
    }
  }
  throw lastError;
}

export async function runAgentConversation(userPrompt, userId) {
  const isOwner = config.allowedUserIds.includes(userId);

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const currentFormatted = formatter.format(new Date());

  const systemInstruction = `
You are the dedicated personal AI scheduling assistant for Vedant.
Current exact time in Pune/IST: ${currentFormatted}.

CRITICAL SCOPE RESTRICTIONS:
1. You ONLY answer questions regarding Vedant's calendar, schedule, availability, and meeting slots.
2. DO NOT answer general questions, trivia, coding, politics, or news.
3. If asked anything other than scheduling, reply:
   "I am only set up to assist with Vedant's schedule and availability. Please ask me about his free slots or upcoming calendar events."

TOOL CALLING:
- Call 'getCalendarEvents' with timeframe='today' for today's schedule.
- Call 'getCalendarEvents' with timeframe='tomorrow' for tomorrow's schedule.
- Call 'getCalendarEvents' with timeframe='YYYY-MM-DD' for explicit dates.
- In your final response, explicitly state the target date (e.g., "For tomorrow, Wednesday, October 7, 2026:").
`;

  const response = await generateWithFallback({
    contents: userPrompt,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: [calendarToolDeclaration] }],
    },
  });

  const functionCalls = response.functionCalls;

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    console.log(`[AGENT TOOL CALL] Executing: ${call.name} with args:`, call.args);

    const toolFn = tools[call.name];
    if (!toolFn) throw new Error(`Tool ${call.name} not found.`);

    const toolResult = await toolFn(call.args, isOwner);

    const secondResponse = await generateWithFallback({
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] },
        response.candidates[0].content,
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: { output: toolResult },
              },
            },
          ],
        },
      ],
      config: { systemInstruction },
    });

    return secondResponse.text;
  }

  return response.text;
}