import { NextResponse } from "next/server";
import { 
  getVolume, 
  getBrightness, 
  getDiskUsage, 
  getTempInfo, 
  isMuted,
  getNetworkSpeed,
  getMediaMetadata,
  getBatteryStatus,
  getWifiSignal,
  getAudioDevices
} from "@/lib/system-control";
import si from "systeminformation";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      cpuLoad,
      memInfo,
      diskUsage,
      tempInfo,
      netSpeed,
      mediaMeta,
      batteryInfo,
      volLevel,
      muteStatus,
      brightLevel,
      wifiInfo,
      audioList
    ] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      getDiskUsage(),
      getTempInfo(),
      getNetworkSpeed(),
      getMediaMetadata(),
      getBatteryStatus(),
      getVolume(),
      isMuted(),
      getBrightness(),
      getWifiSignal(),
      getAudioDevices()
    ]);

    return NextResponse.json({
      hostname: os.hostname(),
      uptime: os.uptime(),
      ip: Object.values(os.networkInterfaces())
        .flat()
        .find((i) => i?.family === "IPv4" && !i.internal)?.address || "127.0.0.1",
      cpu: Math.round(cpuLoad.currentLoad),
      memory: Math.round((memInfo.active / memInfo.total) * 100),
      disk: diskUsage,
      temp: tempInfo,
      rxSpeed: netSpeed.rx,
      txSpeed: netSpeed.tx,
      media: mediaMeta,
      battery: batteryInfo,
      volume: volLevel,
      isMuted: muteStatus,
      brightness: brightLevel,
      wifi: wifiInfo,
      audioDevices: audioList
    });
  } catch (error) {
    console.error("Status API Error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
