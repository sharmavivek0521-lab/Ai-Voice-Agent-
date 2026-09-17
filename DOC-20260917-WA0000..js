const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.MODEL || "gemini-3.8-flash";

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is missing. Add it to .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_INSTRUCTION = `
You are NIRBHAY, a friendly real-time voice AI assistant.
Rules:
- Speak naturally and conversationally.
- Keep responses concise unless the user asks for detail.
- Do not use markdown tables, long lists, or code unless explicitly requested.
- If the user asks you to perform an action, use a tool when available.
- Never claim an action happened unless the tool result confirms it.
- When uncertain, say so clearly.
- The user may speak Hindi, English, or Hinglish. Reply in the language/style used by the user.
`;

function safeToolResult(name, args) {
  if (name === "get_local_time") {
    return {
      tool: name,
      result: {
        iso: new Date().toISOString(),
        local: new Date().toString()
      }
    };
  }

  if (name === "calculate") {
    const expression = String(args?.expression || "").trim();

    // Intentionally allow only numbers and basic operators.
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
      return { tool: name, error: "Only basic arithmetic is allowed." };
    }

    try {
      const value = Function(`"use strict"; return (${expression})`)();
      if (!Number.isFinite(value)) {
        return { tool: name, error: "The result is not finite." };
      }
      return { tool: name, result: value };
    } catch {
      return { tool: name, error: "Invalid arithmetic expression." };
    }
  }

  return { tool: name, error: "Unknown tool." };
}

async function runAgent(history) {
  const tools = [
    {
      functionDeclarations: [
        {
          name: "get_local_time",
          description: "Get the server's current local time.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "calculate",
          description: "Calculate basic arithmetic.",
          parameters: {
            type: "OBJECT",
            properties: {
              expression: {
                type: "STRING",
                description: "A basic arithmetic expression such as 25*4+10"
              }
            },
            required: ["expression"]
          }
        }
      ]
    }
  ];

  let contents = Array.isArray(history) ? history.slice(-20) : [];

  for (let pass = 0; pass < 3; pass++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        tools
      }
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const functionCalls = parts.filter(p => p.functionCall);

    if (!functionCalls.length) {
      return {
        text: response.text || "I couldn't generate a response.",
        history: contents.concat([
          {
            role: "model",
            parts: parts.length ? parts : [{ text: response.text || "" }]
          }
        ])
      };
    }

    // Preserve the model's tool-call turn.
    contents.push({
      role: "model",
      parts
    });

    const toolParts = [];
    for (const part of functionCalls) {
      const call = part.functionCall;
      const result = safeToolResult(call.name, call.args || {});
      toolParts.push({
        functionResponse: {
          name: call.name,
          response: result
        }
      });
    }

    contents.push({
      role: "user",
      parts: toolParts
    });
  }

  return {
    text: "I wasn't able to finish that action.",
    history: contents
  };
}

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const history = req.body?.history;
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "history must be an array." });
    }

    const result = await runAgent(history);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "The voice agent failed to respond.",
      detail: process.env.NODE_ENV === "development" ? String(error) : undefined
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.listen(PORT, () => {
  console.log(`Voice AI Agent running at http://localhost:${PORT}`);
});
