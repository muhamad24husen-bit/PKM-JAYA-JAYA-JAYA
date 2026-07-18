import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mqtt from "mqtt";
import {
  DEFAULT_DEVICE_ID,
  DEFAULT_MQTT_URL,
  DEFAULT_TOPIC,
  HISTORY_LIMIT,
  parseTelemetryMessage,
} from "../lib/telemetry.shared.mjs";
import { createRollupStore } from "./rollup.mjs";
import { createSimulatorRunner } from "./simulator.mjs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mqttUrl = process.env.MQTT_URL || DEFAULT_MQTT_URL;
const topic = process.env.MQTT_TOPIC || DEFAULT_TOPIC;
const port = Number(process.env.BACKEND_PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const historyFile = process.env.HISTORY_FILE
  ? path.resolve(process.env.HISTORY_FILE)
  : path.join(__dirname, "data", "history.json");
const rollupFile = process.env.ROLLUP_FILE
  ? path.resolve(process.env.ROLLUP_FILE)
  : path.join(__dirname, "data", "rollup.json");

const rollup = createRollupStore({ filePath: rollupFile });

// Publish lewat client MQTT bridge → broker mengirim balik ke subscription,
// sehingga simulasi menempuh jalur data produksi yang sama dengan perangkat asli.
const simulator = createSimulatorRunner({
  publish: (payload) => {
    mqttClient.publish(topic, JSON.stringify(payload));
  },
  onUpdate: () => broadcastStatus(),
});

const nvidiaApiKey = process.env.NVIDIA_API_KEY || "";
const nvidiaModel = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
const insightIntervalMs = Number(process.env.INSIGHT_INTERVAL_MS || 45000);
const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const INSIGHT_HISTORY_WINDOW = 40;

const app = express();
const sseClients = new Set();

let brokerStatus = "disconnected";
let lastError = "";
let latestTelemetry = null;
let history = [];
let persistTimer = null;
let latestInsight = nvidiaApiKey
  ? null
  : {
      text: null,
      generatedAt: null,
      error: "AI Insight belum dikonfigurasi. Set NVIDIA_API_KEY di server/.env untuk mengaktifkan.",
    };

function loadHistory() {
  try {
    const raw = fs.readFileSync(historyFile, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      history = parsed.slice(0, HISTORY_LIMIT);
      latestTelemetry = history[0] || null;
      console.log(`Memuat ${history.length} data riwayat dari ${historyFile}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Gagal memuat cache riwayat: ${error.message}`);
    }
  }
}

function writeHistory() {
  try {
    fs.mkdirSync(path.dirname(historyFile), { recursive: true });
    fs.writeFileSync(historyFile, JSON.stringify(history));
  } catch (error) {
    console.warn(`Gagal menyimpan riwayat: ${error.message}`);
  }
}

// Tulis ke disk paling sering sekali per detik agar tidak membebani I/O pada telemetri 1 Hz.
function persistHistory() {
  if (persistTimer) {
    return;
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    writeHistory();
  }, 1000);
}

function flushHistory() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  writeHistory();
}

function allowedOrigins() {
  if (frontendOrigin === "*") {
    return true;
  }

  return frontendOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
}

app.use(cors({ origin: allowedOrigins() }));
app.use(express.json());

function statusPayload() {
  return {
    service: "ok",
    brokerStatus,
    mqttUrl,
    topic,
    sseClients: sseClients.size,
    historyCount: history.length,
    simulation: simulator.status(),
    lastError,
    updatedAt: new Date().toISOString(),
  };
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data) {
  for (const client of sseClients) {
    sendSse(client, event, data);
  }
}

function broadcastStatus() {
  broadcast("status", statusPayload());
}

function addTelemetry(item) {
  latestTelemetry = item;
  history = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, HISTORY_LIMIT);
  broadcast("telemetry", item);
  persistHistory();
  rollup.add(item);
}

app.get("/api/health", (_req, res) => {
  res.json(statusPayload());
});

app.get("/api/telemetry/latest", (_req, res) => {
  res.json(latestTelemetry);
});

app.get("/api/telemetry/history", (_req, res) => {
  res.json(history);
});

app.get("/api/telemetry/rollup", (_req, res) => {
  res.json(rollup.snapshot());
});

app.post("/api/simulate/start", (req, res) => {
  const backfillHours = Number(req.body?.backfillHours);
  if (!Number.isFinite(backfillHours) || backfillHours < 0 || backfillHours > 72) {
    res.status(400).json({ error: "backfillHours harus angka 0-72." });
    return;
  }
  if (simulator.status().running) {
    res.status(409).json({ error: "Simulasi sudah berjalan." });
    return;
  }
  if (brokerStatus !== "connected") {
    res.status(409).json({ error: "Broker MQTT tidak terhubung." });
    return;
  }
  // Broadcast SSE status terjadi lewat onUpdate runner pada tiap transisi fase.
  const simulation = simulator.start({ backfillHours });
  res.status(202).json({ simulation });
});

app.post("/api/simulate/stop", (_req, res) => {
  const simulation = simulator.stop();
  res.json({ simulation });
});

app.get("/api/insight/latest", (_req, res) => {
  res.json(latestInsight);
});

app.delete("/api/telemetry/history", (_req, res) => {
  history = [];
  latestTelemetry = null;
  flushHistory();
  rollup.clear();
  broadcast("history-clear", { updatedAt: new Date().toISOString() });
  broadcastStatus();
  res.status(204).end();
});

app.get("/api/telemetry/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  sseClients.add(res);
  sendSse(res, "status", statusPayload());
  if (latestTelemetry) {
    sendSse(res, "telemetry", latestTelemetry);
  }
  if (latestInsight) {
    sendSse(res, "insight", latestInsight);
  }

  const heartbeat = setInterval(() => {
    sendSse(res, "heartbeat", { updatedAt: new Date().toISOString() });
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

function buildInsightPrompt() {
  const recent = history.slice(0, INSIGHT_HISTORY_WINDOW);
  const rso2Values = recent.map((item) => Number(item.rso2)).filter(Number.isFinite);
  const average = rso2Values.length ? rso2Values.reduce((sum, value) => sum + value, 0) / rso2Values.length : null;

  const lines = [
    `Device: ${latestTelemetry?.deviceId || DEFAULT_DEVICE_ID}`,
    `rSO2 saat ini: ${latestTelemetry?.rso2 ?? "-"}%`,
    `Status alert saat ini: ${latestTelemetry?.alertStatus ?? "-"}`,
    `Signal Quality Index saat ini: ${latestTelemetry?.sqi ?? "-"}%`,
    `Motion: ${latestTelemetry?.motion ?? "-"}`,
    `Battery: ${latestTelemetry?.battery ?? "-"}%`,
    rso2Values.length > 1
      ? `Tren dari ${rso2Values.length} pembacaan terakhir: rata-rata ${average.toFixed(1)}%, minimum ${Math.min(...rso2Values)}%, maksimum ${Math.max(...rso2Values)}%.`
      : "Belum cukup histori untuk menghitung tren.",
  ];

  return lines.join("\n");
}

async function generateInsight() {
  if (!nvidiaApiKey || !latestTelemetry) {
    return;
  }

  try {
    const response = await fetch(NVIDIA_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${nvidiaApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: nvidiaModel,
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah asisten analisis pada dashboard monitoring prototipe riset NIRWANA-AI yang mengukur estimasi rSO2 (saturasi oksigen jaringan ginjal) neonatus memakai sensor NIR eksperimental. Tulis satu hingga dua kalimat insight singkat berbahasa Indonesia, gaya netral seperti catatan observasi, berdasarkan HANYA data yang diberikan. Jangan memberi diagnosis atau saran medis, jangan mengarang data yang tidak diberikan, dan jangan pakai format markdown.",
          },
          { role: "user", content: buildInsightPrompt() },
        ],
        temperature: 0.4,
        top_p: 1,
        max_tokens: 150,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API merespons status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("NVIDIA API tidak mengembalikan teks.");
    }

    latestInsight = { text, generatedAt: new Date().toISOString(), error: "" };
  } catch (error) {
    console.warn(`Gagal menghasilkan AI insight: ${error.message}`);
    latestInsight = {
      text: latestInsight?.text || null,
      generatedAt: latestInsight?.generatedAt || null,
      error: `Gagal memperbarui AI insight: ${error.message}`,
    };
  }

  broadcast("insight", latestInsight);
}

const mqttClient = mqtt.connect(mqttUrl, {
  clean: true,
  connectTimeout: 5000,
  reconnectPeriod: 3000,
});

mqttClient.on("connect", () => {
  brokerStatus = "connected";
  lastError = "";
  mqttClient.subscribe(topic, (error) => {
    if (error) {
      brokerStatus = "error";
      lastError = `Gagal subscribe topic ${topic}: ${error.message}`;
    }
    broadcastStatus();
  });
  broadcastStatus();
});

mqttClient.on("reconnect", () => {
  brokerStatus = "reconnecting";
  broadcastStatus();
});

mqttClient.on("close", () => {
  if (brokerStatus !== "reconnecting") {
    brokerStatus = "disconnected";
  }
  broadcastStatus();
});

mqttClient.on("offline", () => {
  brokerStatus = "disconnected";
  broadcastStatus();
});

mqttClient.on("error", (error) => {
  brokerStatus = "error";
  lastError = `Koneksi MQTT bermasalah: ${error.message}`;
  broadcastStatus();
});

mqttClient.on("message", (_topic, message) => {
  try {
    const item = parseTelemetryMessage(message);
    lastError = "";
    addTelemetry(item);
  } catch (error) {
    lastError = `Payload MQTT tidak valid dan diabaikan: ${error.message}`;
    console.warn(lastError);
    broadcastStatus();
  }
});

loadHistory();
rollup.load();

let insightTimer = null;
if (nvidiaApiKey) {
  generateInsight();
  insightTimer = setInterval(generateInsight, insightIntervalMs);
} else {
  console.warn("NVIDIA_API_KEY belum diisi — fitur AI Insight dinonaktifkan.");
}

const server = app.listen(port, () => {
  console.log(`NIRWANA-AI MQTT bridge running on http://localhost:${port}`);
  console.log(`Subscribing to ${mqttUrl} topic ${topic}`);
});

function shutdown() {
  flushHistory();
  rollup.flush();
  simulator.stop();
  if (insightTimer) {
    clearInterval(insightTimer);
  }
  for (const client of sseClients) {
    client.end();
  }
  mqttClient.end(true);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);