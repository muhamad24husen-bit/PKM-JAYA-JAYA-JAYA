import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mqtt from "mqtt";
import {
  DEFAULT_MQTT_URL,
  DEFAULT_TOPIC,
  HISTORY_LIMIT,
  parseTelemetryMessage,
} from "../lib/telemetry.shared.mjs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mqttUrl = process.env.MQTT_URL || DEFAULT_MQTT_URL;
const topic = process.env.MQTT_TOPIC || DEFAULT_TOPIC;
const port = Number(process.env.BACKEND_PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const historyFile = process.env.HISTORY_FILE
  ? path.resolve(process.env.HISTORY_FILE)
  : path.join(__dirname, "data", "history.json");

const app = express();
const sseClients = new Set();

let brokerStatus = "disconnected";
let lastError = "";
let latestTelemetry = null;
let history = [];
let persistTimer = null;

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

app.delete("/api/telemetry/history", (_req, res) => {
  history = [];
  latestTelemetry = null;
  flushHistory();
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

  const heartbeat = setInterval(() => {
    sendSse(res, "heartbeat", { updatedAt: new Date().toISOString() });
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

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

const server = app.listen(port, () => {
  console.log(`NIRWANA-AI MQTT bridge running on http://localhost:${port}`);
  console.log(`Subscribing to ${mqttUrl} topic ${topic}`);
});

function shutdown() {
  flushHistory();
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
