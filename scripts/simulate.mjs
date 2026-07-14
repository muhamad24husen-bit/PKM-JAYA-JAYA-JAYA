import dotenv from "dotenv";
import mqtt from "mqtt";
import { DEFAULT_MQTT_URL, DEFAULT_TOPIC } from "../lib/telemetry.shared.mjs";
import { buatSampel, buatStateAwal, deretBackfill } from "./simulate.gen.mjs";

dotenv.config();

const USAGE = `Simulator data NIRWANA-AI — publish payload MQTT realistis untuk uji dashboard.

Pemakaian:
  npm run simulate                     backfill 26 jam + live 1 Hz
  npm run simulate -- --backfill 2    backfill 2 jam + live
  npm run simulate -- --backfill 0    langsung live tanpa backfill
  npm run simulate -- --interval 500  periode live 500 ms

Flag:
  --backfill <jam>   jam riwayat yang diisi ke belakang (default 26, 0 = lewati)
  --interval <ms>    periode publish live dalam ms (default 1000, min 100)
  --help             tampilkan bantuan ini

Broker/topic dari env MQTT_URL & MQTT_TOPIC (lihat .env), default mqtt://localhost:1883 / nirwana/telemetry.`;

function parseArgs(argv) {
  const opsi = { backfill: 26, interval: 1000 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--backfill") {
      opsi.backfill = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--interval") {
      opsi.interval = Number(argv[i + 1]);
      i += 1;
    } else {
      return { error: `Flag tidak dikenal: ${arg}` };
    }
  }
  if (!Number.isFinite(opsi.backfill) || opsi.backfill < 0) {
    return { error: "--backfill harus angka >= 0 (jam)" };
  }
  if (!Number.isFinite(opsi.interval) || opsi.interval < 100) {
    return { error: "--interval harus angka >= 100 (ms)" };
  }
  return { opsi };
}

const hasilParse = parseArgs(process.argv.slice(2));
if (hasilParse.help) {
  console.log(USAGE);
  process.exit(0);
}
if (hasilParse.error) {
  console.error(`${hasilParse.error}\n\n${USAGE}`);
  process.exit(1);
}
const { opsi } = hasilParse;

const mqttUrl = process.env.MQTT_URL || DEFAULT_MQTT_URL;
const topic = process.env.MQTT_TOPIC || DEFAULT_TOPIC;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let terkirim = 0;
let liveTimer = null;
let terhubung = false;

const client = mqtt.connect(mqttUrl, { connectTimeout: 5000, reconnectPeriod: 3000 });

client.on("error", (error) => {
  const detail = error.message || error.code || "koneksi ditolak";
  if (!terhubung) {
    console.error(`Broker MQTT tidak bisa dihubungi di ${mqttUrl} — jalankan Mosquitto dulu. (${detail})`);
    process.exit(1);
  }
  console.warn(`Koneksi MQTT bermasalah: ${detail} (mencoba ulang otomatis)`);
});

function kirim(payload) {
  client.publish(topic, JSON.stringify(payload));
  terkirim += 1;
}

async function mulai() {
  const now = Date.now();
  let state = buatStateAwal(now, opsi.backfill);

  if (opsi.backfill > 0) {
    const deret = deretBackfill(now, opsi.backfill);
    console.log(`Backfill ${opsi.backfill} jam (${deret.length} sampel per menit) ke topic ${topic}...`);
    for (let i = 0; i < deret.length; i += 1) {
      const hasil = buatSampel(deret[i], state);
      state = hasil.state;
      kirim({ ...hasil.payload, timestamp: new Date(deret[i]).toISOString() });
      if ((i + 1) % 240 === 0) console.log(`  ...${i + 1}/${deret.length} sampel`);
      await sleep(15);
    }
    console.log(`Backfill selesai (${deret.length} sampel).`);
  }

  console.log(`Live tiap ${opsi.interval} ms — hentikan dengan Ctrl+C.`);
  liveTimer = setInterval(() => {
    const hasil = buatSampel(Date.now(), state);
    state = hasil.state;
    kirim(hasil.payload);
    if (terkirim % 30 === 0) {
      console.log(`  live: rso2 ${hasil.payload.rso2}% [${hasil.payload.alertStatus}] — total ${terkirim} pesan`);
    }
  }, opsi.interval);
}

client.on("connect", () => {
  if (terhubung) return; // reconnect: jangan mulai ulang simulasi
  terhubung = true;
  console.log(`Terhubung ke ${mqttUrl}`);
  mulai();
});

process.on("SIGINT", () => {
  if (liveTimer) clearInterval(liveTimer);
  client.end(true, () => {
    console.log(`\nSimulasi berhenti. Total ${terkirim} pesan terkirim ke ${topic}.`);
    process.exit(0);
  });
});
