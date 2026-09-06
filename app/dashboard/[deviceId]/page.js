import { notFound } from "next/navigation";
import { devices, findDevice } from "@/lib/devices";
import { MonitoringApp } from "@/components/MonitoringApp";

export function generateStaticParams() {
  return devices.filter((device) => !device.placeholder).map((device) => ({ deviceId: device.id }));
}

export default async function DeviceMonitoringPage({ params }) {
  const { deviceId } = await params;
  const device = findDevice(deviceId);

  if (!device || device.placeholder) {
    notFound();
  }

  return <MonitoringApp device={device} />;
}
