import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DEFAULT_DEVICE_ID, formatDateTime, toDisplayValue } from "./telemetry";

function pad(value) {
  return String(value).padStart(2, "0");
}

function buildFileName(date = new Date()) {
  return `NIRWANA-AI_Riwayat-Monitoring_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}_${pad(date.getHours())}-${pad(date.getMinutes())}.pdf`;
}

export function exportHistoryToPDF(history) {
  if (!history.length) {
    return false;
  }

  const latest = history[0];
  const exportedAt = new Date();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(13, 21, 21);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(0, 242, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NIRWANA-AI Monitoring Report", 14, 16);

  doc.setTextColor(220, 228, 228);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("NIRWANA-AI Monitoring Dashboard", 14, 24);

  const summaryY = 44;
  const left = [
    ["Device ID", latest.deviceId || DEFAULT_DEVICE_ID],
    ["Mode", "Prototype"],
    ["Koneksi", "MQTT / WiFi"],
    ["Tanggal Export", formatDateTime(exportedAt.toISOString())],
  ];
  const right = [
    ["Jumlah Data", `${history.length} data`],
    ["rSO2 Terakhir", toDisplayValue(latest.rso2, "%")],
    ["Status Terakhir", latest.alertStatus || "-"],
  ];

  doc.setFontSize(10);
  left.forEach(([label, value], index) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}`, 14, summaryY + index * 7);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${value}`, 48, summaryY + index * 7);
  });

  right.forEach(([label, value], index) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}`, 150, summaryY + index * 7);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${value}`, 188, summaryY + index * 7);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Tabel Riwayat Data", 14, 79);

  autoTable(doc, {
    startY: 84,
    head: [["No", "Waktu", "rSO2 (%)", "RED", "IR", "Ratio", "Motion", "SQI (%)", "Battery (%)", "Status"]],
    body: history.map((item, index) => [
      index + 1,
      formatDateTime(item.timestamp),
      toDisplayValue(item.rso2),
      toDisplayValue(item.red),
      toDisplayValue(item.ir),
      toDisplayValue(item.ratio),
      toDisplayValue(item.motion),
      toDisplayValue(item.sqi),
      toDisplayValue(item.battery),
      toDisplayValue(item.alertStatus),
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      textColor: [42, 50, 50],
    },
    headStyles: {
      fillColor: [0, 128, 128],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [238, 250, 250],
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setTextColor(65, 65, 65);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(
    "Catatan: Data pada laporan ini berasal dari purwarupa NIRWANA-AI dan digunakan untuk keperluan pengujian laboratorium. Data belum digunakan sebagai dasar diagnosis klinis.",
    14,
    finalY,
    { maxWidth: pageWidth - 28 },
  );

  doc.save(buildFileName(exportedAt));
  return true;
}
