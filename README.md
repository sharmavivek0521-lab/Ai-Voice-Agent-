# NIRBHAY Voice AI Agent

A simple, runnable Voice AI Agent built as a cascaded pipeline:

**Microphone → Speech Recognition → Gemini → Speech Synthesis**

## Features

- Voice input from the browser
- English / Hindi / Indian English recognition modes
- Gemini-powered conversational brain
- Short conversational replies
- Two starter tools:
  - `get_local_time`
  - `calculate`
- Conversation history
- Stop/interrupt button for speech playback
- API key stays on the server

## Requirements

- Node.js 18+
- A Gemini API key
- A browser with SpeechRecognition support
- Microphone permission

Google's current Gemini SDK is `@google/genai`, and the current model documentation lists `gemini-3.8-flash` as a stable Flash model. Keep the `MODEL` value in `.env` configurable so you can change models without touching the code.

## Setup

1. Open a terminal inside this folder.

2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

4. Put your Gemini API key inside `.env`:

```text
GEMINI_API_KEY=YOUR_KEY
MODEL=gemini-3.8-flash
PORT=3000
```

5. Start:

```bash
npm start
```

6. Open:

```text
http://localhost:3000
```

## Architecture

```text
             USER
               │
               ▼
      ┌────────────────┐
      │ Browser Mic    │
      │ SpeechRecognition
      └───────┬────────┘
              │ text
              ▼
      ┌────────────────┐
      │ Node / Express │
      └───────┬────────┘
              ▼
      ┌────────────────┐
      │ Gemini LLM     │
      │ + tools        │
      └───────┬────────┘
              │ text
              ▼
      ┌────────────────┐
      │ SpeechSynthesis │
      └───────┬────────┘
              ▼
             USER
```

## Important prototype limitation

The browser `SpeechRecognition` API has limited availability across browsers and, on some browsers, recognition can use a server-based recognition engine. For a production voice agent, replace the browser recognition layer with a dedicated streaming STT or a real-time speech-to-speech/live API.

## Next production upgrades

- WebRTC or WebSocket audio transport
- Streaming STT
- Streaming LLM output
- Streaming TTS
- Robust VAD + turn detection
- Barge-in cancellation while the AI is speaking
- Authentication and authorization
- Persistent memory
- Tool permissions and timeouts
- Structured logs, tracing and latency metrics
- Rate limiting
- PII redaction
- Human handoff
- Telephony integration

## Security

Never put `GEMINI_API_KEY` in the browser code. Keep it on the server and out of source control.

For real production deployment, also add authentication, request limits, tool authorization, input validation, and secure logging.
