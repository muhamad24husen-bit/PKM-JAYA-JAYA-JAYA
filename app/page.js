"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { exportHistoryToPDF } from "@/lib/pdf";
import {
  DEFAULT_DEVICE_ID,
  DEFAULT_TELEMETRY_API,
  DEFAULT_TOPIC,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  createDemoTelemetry,
} from "@/lib/telemetry";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { TopAppBar } from "@/components/TopAppBar";
import { DashboardView } from "@/components/views/DashboardView";
import { RealtimeView } from "@/components/views/RealtimeView";
import { HistoryPanel } from "@/components/views/HistoryView";
import { AlertView } from "@/components/views/AlertView";
import { DeviceView } from "@/components/views/DeviceView";
import { SettingsView } from "@/components/views/SettingsView";

const SIDEBAR_STORAGE_KEY = "nirwana-ai-sidebar-collapsed";

const dashboardFallback = {
  id: "reference-preview",
  timestamp: "2026-06-14T09:20:00+07:00",
  deviceId: DEFAULT_DEVICE_ID,
  rso2: 42,
  red: 52420,
  ir: 68360,
  ratio: 0.767,
  motion: "Stabil",
  sqi: 92,
  battery: 87,
  alertStatus: "HIPOKSIA",
};

const realtimeFallback = {
  ...dashboardFallback,
  id: "realtime-reference-preview",
  rso2: 68,
  red: 52420,
  ir: 68360,
  motion: "Low",
  sqi: 98.2,
  alertStatus: "NORMAL",
};

function buildApiUrl(baseUrl, path) {
  return new URL(path, baseUrl).toString();
}

function mergeHistoryItems(currentHistory, incomingItems) {
  const merged = [];
  const seen = new Set();

  for (const item of [...incomingItems, ...currentHistory]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
    if (merged.length >= HISTORY_LIMIT) break;
  }

  return merged;
}

export default function Home() {
  const [telemetryApiUrl] = useState(() => (process.env.NEXT_PUBLIC_TELEMETRY_API || DEFAULT_TELEMETRY_API).replace(/\/+$/, ""));
  const [topic] = useState(process.env.NEXT_PUBLIC_MQTT_TOPIC || DEFAULT_TOPIC);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [history, setHistory] = useState([]);
  const [lastError, setLastError] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [activeView, setActiveView] = useState("realtime");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const demoIndex = useRef(0);

  useEffect(() => {
    let timeoutId;
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return undefined;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        timeoutId = window.setTimeout(() => {
          setHistory(parsed.slice(0, HISTORY_LIMIT));
        }, 0);
      }
    } catch {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  }, [history]);

  useEffect(() => {
    let cancelled = false;

    async function loadBackendHistory() {
      try {
        const response = await fetch(buildApiUrl(telemetryApiUrl, "/api/telemetry/history"), {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Backend telemetry belum siap.");
        }

        const backendHistory = await response.json();
        if (!cancelled && Array.isArray(backendHistory)) {
          setHistory((currentHistory) => mergeHistoryItems(currentHistory, backendHistory));
        }
      } catch {
        if (!cancelled) {
          setLastError("Backend telemetry belum tersedia. Jalankan npm run backend atau gunakan simulasi.");
        }
      }
    }

    loadBackendHistory();

    return () => {
      cancelled = true;
    };
  }, [telemetryApiUrl]);

  useEffect(() => {
    const stream = new EventSource(buildApiUrl(telemetryApiUrl, "/api/telemetry/stream"));

    stream.addEventListener("status", (event) => {
      try {
        const payload = JSON.parse(event.data);
        setConnectionStatus(payload.brokerStatus || "disconnected");
        setLastError(payload.lastError || "");
      } catch {
        setConnectionStatus("error");
        setLastError("Status backend telemetry tidak valid.");
      }
    });

    stream.addEventListener("telemetry", (event) => {
      try {
        const item = JSON.parse(event.data);
        setHistory((currentHistory) => mergeHistoryItems(currentHistory, [item]));
        setLastError("");
      } catch {
        setLastError("Data telemetry dari backend tidak valid dan diabaikan.");
      }
    });

    stream.addEventListener("history-clear", () => {
      setHistory([]);
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    });

    stream.onerror = () => {
      setConnectionStatus("error");
      setLastError("Stream backend telemetry terputus. Jalankan npm run backend atau gunakan simulasi.");
    };

    return () => {
      stream.close();
    };
  }, [telemetryApiUrl]);

  useEffect(() => {
    if (!simulationEnabled || connectionStatus === "connected") return undefined;

    const intervalId = window.setInterval(() => {
      const item = createDemoTelemetry(demoIndex.current);
      demoIndex.current += 1;
      setHistory((currentHistory) => [item, ...currentHistory].slice(0, HISTORY_LIMIT));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [connectionStatus, simulationEnabled]);

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "true") return undefined;

    const timeoutId = window.setTimeout(() => setSidebarCollapsed(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const current = history[0];
  const displayCurrent = current || dashboardFallback;
  const chartData = useMemo(() => {
    if (!history.length) {
      return Array.from({ length: 30 }, (_, index) => ({
        second: index,
        rso2: 51 + Math.sin(index * 0.55) * (5 + index * 0.28),
        redLevel: 50 + Math.sin(index * 0.62) * 18 + Math.cos(index * 0.21) * 6,
        irLevel: 54 + Math.cos(index * 0.53) * 15 + Math.sin(index * 0.26) * 7,
      }));
    }

    const ordered = history.slice().reverse();
    const normalize = (value, values) => {
      const numeric = values.filter(Number.isFinite);
      if (!numeric.length || !Number.isFinite(value)) return null;
      const min = Math.min(...numeric);
      const max = Math.max(...numeric);
      if (max === min) return 50;
      return 15 + ((value - min) / (max - min)) * 70;
    };
    const redValues = ordered.map((item) => Number(item.red));
    const irValues = ordered.map((item) => Number(item.ir));

    return ordered.map((item, index) => ({
      second: index,
      rso2: Number(item.rso2),
      redLevel: normalize(Number(item.red), redValues),
      irLevel: normalize(Number(item.ir), irValues),
    }));
  }, [history]);

  function addDemoData() {
    const item = createDemoTelemetry(demoIndex.current);
    demoIndex.current += 1;
    setHistory((currentHistory) => [item, ...currentHistory].slice(0, HISTORY_LIMIT));
    setHistoryMessage("");
  }

  async function clearHistory() {
    setHistory([]);
    setHistoryMessage("Riwayat data telah dihapus.");
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);

    try {
      await fetch(buildApiUrl(telemetryApiUrl, "/api/telemetry/history"), {
        method: "DELETE",
      });
    } catch {
      setLastError("Backend tidak dapat menghapus cache riwayat, tetapi riwayat lokal sudah dikosongkan.");
    }
  }

  function handleExport() {
    if (!history.length) {
      setHistoryMessage("Data riwayat masih kosong");
      return;
    }

    exportHistoryToPDF(history);
    setHistoryMessage("PDF riwayat monitoring berhasil dibuat.");
  }

  const realtimeCurrent = current || realtimeFallback;

  return (
    <main className="min-h-screen bg-[#080f10] text-[#dce4e4]">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />

      <div
        className={`min-h-screen transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[280px]"
        }`}
      >
        <MobileNavigation activeView={activeView} onNavigate={setActiveView} />

        {activeView === "realtime" ? (
          <RealtimeView
            current={realtimeCurrent}
            connectionStatus={connectionStatus}
            chartData={chartData}
            lastError={lastError}
            topic={topic}
            telemetryApiUrl={telemetryApiUrl}
            simulationEnabled={simulationEnabled}
            onToggleSimulation={() => setSimulationEnabled((enabled) => !enabled)}
          />
        ) : (
          <>
            <TopAppBar current={displayCurrent} />
            <div className="dashboard-grid min-h-[calc(100vh-81px)] overflow-y-auto px-5 py-6 sm:px-8">
              <div className="mx-auto max-w-[1240px]">
                {activeView === "history" ? (
                  <HistoryPanel history={history} onExport={handleExport} onClear={clearHistory} message={historyMessage} />
                ) : activeView === "alert" ? (
                  <AlertView history={history} current={displayCurrent} />
                ) : activeView === "device" ? (
                  <DeviceView
                    current={displayCurrent}
                    connectionStatus={connectionStatus}
                    lastError={lastError}
                    topic={topic}
                    telemetryApiUrl={telemetryApiUrl}
                  />
                ) : activeView === "settings" ? (
                  <SettingsView
                    topic={topic}
                    telemetryApiUrl={telemetryApiUrl}
                    connectionStatus={connectionStatus}
                    simulationEnabled={simulationEnabled}
                    onToggleSimulation={() => setSimulationEnabled((enabled) => !enabled)}
                  />
                ) : (
                  <DashboardView
                    current={displayCurrent}
                    connectionStatus={connectionStatus}
                    lastError={lastError}
                    topic={topic}
                    telemetryApiUrl={telemetryApiUrl}
                    onAddDemo={addDemoData}
                    history={history}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
