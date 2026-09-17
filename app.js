const talkBtn = document.getElementById("talkBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const transcriptEl = document.getElementById("transcript");
const replyEl = document.getElementById("reply");
const langEl = document.getElementById("lang");
const orb = document.getElementById("orb");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let running = false;
let history = [];
let requestController = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langEl.value;
  utterance.rate = 1.02;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    setStatus("Speaking");
    orb.classList.add("active");
  };

  utterance.onend = () => {
    orb.classList.remove("active");
    setStatus("Ready");
  };

  window.speechSynthesis.speak(utterance);
}

async function askAgent(text) {
  if (requestController) requestController.abort();
  requestController = new AbortController();

  history.push({
    role: "user",
    parts: [{ text }]
  });

  setStatus("Thinking");
  replyEl.textContent = "Thinking…";

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
    signal: requestController.signal
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  history = data.history || history;
  const answer = data.text || "I don't have a response.";
  replyEl.textContent = answer;
  speak(answer);
}

function setupRecognition() {
  if (!SpeechRecognition) {
    talkBtn.disabled = true;
    setStatus("SpeechRecognition unavailable");
    replyEl.textContent =
      "This browser does not provide SpeechRecognition. Try a browser with Web Speech recognition support.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = langEl.value;

  recognition.onstart = () => {
    running = true;
    orb.classList.add("active");
    setStatus("Listening");
    transcriptEl.textContent = "Listening…";
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const part = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += part;
      else interimText += part;
    }

    transcriptEl.textContent = finalText || interimText || "…";

    if (finalText.trim()) {
      sendFinal(finalText.trim());
    }
  };

  recognition.onerror = (event) => {
    running = false;
    orb.classList.remove("active");
    setStatus(`Voice error: ${event.error}`);
  };

  recognition.onend = () => {
    running = false;
    orb.classList.remove("active");
    if (statusEl.textContent === "Listening") {
      setStatus("Ready");
    }
  };
}

async function sendFinal(text) {
  try {
    if (recognition && running) recognition.stop();
    await askAgent(text);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    setStatus("Error");
    replyEl.textContent = error.message;
  }
}

talkBtn.addEventListener("click", () => {
  stopSpeaking();

  if (!recognition) {
    setupRecognition();
  }

  if (!recognition || running) return;

  recognition.lang = langEl.value;

  try {
    recognition.start();
  } catch (err) {
    console.error(err);
    setStatus("Could not start microphone");
  }
});

stopBtn.addEventListener("click", () => {
  if (recognition && running) recognition.stop();
  if (requestController) requestController.abort();
  stopSpeaking();
  orb.classList.remove("active");
  setStatus("Ready");
});

langEl.addEventListener("change", () => {
  if (recognition) recognition.lang = langEl.value;
});

setupRecognition();
