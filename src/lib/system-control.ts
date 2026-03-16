

import { spawn } from "child_process";
import si from "systeminformation";

export type PowerAction = "sleep" | "shutdown" | "restart" | "hibernate" | "lock";

/**
 * Persistent PowerShell bridge to avoid sub-process startup lag (approx 150ms).
 */
class PowerShellBridge {
  private child: any;
  private isReady: boolean = false;
  private queue: string[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "-"]);
      this.child.stdin.setEncoding("utf-8");
      
      // Force UTF-8 Encoding for Turkish characters support
      this.child.stdin.write("[Console]::InputEncoding = [Console]::OutputEncoding = $OutputEncoding = [System.Text.Encoding]::UTF8;\n");
      
      // Pre-load common types
      this.child.stdin.write("Add-Type -AssemblyName System.Windows.Forms, System.Drawing;\n");
      
      this.isReady = true;

      this.child.stderr.on("data", (data: any) => {
         console.error("PS Bridge Error:", data.toString());
      });

      this.child.on("exit", () => {
         this.isReady = false;
         setTimeout(() => this.init(), 1000); 
      });
    } catch (e) {
      console.error("Failed to init PS Bridge:", e);
    }
  }

  public send(script: string) {
    if (this.isReady) {
       this.child.stdin.write(script + "\n");
    }
  }

  public async execute(script: string): Promise<string> {
    return runPowerShellOneShot(script);
  }
}

// Global singleton for Next.js hot-reloading stability
const globalWithPS = global as typeof globalThis & { psBridge?: PowerShellBridge };
const psBridge = globalWithPS.psBridge || new PowerShellBridge();
if (process.env.NODE_ENV !== "production") globalWithPS.psBridge = psBridge;

async function runPowerShellOneShot(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`Exit ${code}: ${stderr}`));
      else resolve(stdout.trim());
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}

/**
 * Standard PowerShell execution.
 */
export async function runPowerShell(script: string): Promise<string> {
  return runPowerShellOneShot(script);
}

// Global virtual volume state for getVolume() sync
let virtualVolume = 50;

/**
 * SET VOLUME (0-100)
 */
export async function setVolume(level: number): Promise<void> {
  const p = Math.max(0, Math.min(100, level));
  virtualVolume = p;
  
  // Bulletproof Reset-to-Zero then Step-Up loop
  // Each key is 2%, so 50 is 100%
  const steps = Math.floor(p / 2);
  const script = `
    $w = New-Object -ComObject WScript.Shell;
    for($i=0; $i -lt 50; $i++) { $w.SendKeys([char]174) }; 
    for($i=0; $i -lt ${steps}; $i++) { $w.SendKeys([char]175) };
  `;
  psBridge.send(script);
}

/**
 * GET VOLUME (0-100)
 */
export async function getVolume(): Promise<number> {
  // Return virtual state for consistent UI
  return virtualVolume;
}

/**
 * MUTE / UNMUTE
 */
export async function setMute(mute: boolean): Promise<void> {
  psBridge.send(`(New-Object -ComObject WScript.Shell).SendKeys([char]173)`);
}

export async function isMuted(): Promise<boolean> {
  return false; // Toggle-style key (173) doesn't provide state without Core Audio
}

/**
 * ADVANCED AUDIO DEVICE MANAGEMENT
 */
export async function getAudioDevices(): Promise<{ Index: number; Name: string; Default: boolean }[]> {
  try {
    const script = `
      Import-Module ./AudioDeviceCmdlets.dll -ErrorAction SilentlyContinue;
      Get-AudioDevice -List | Where-Object { $_.Type -eq 'Playback' } | Select-Object Index, Name, Default | ConvertTo-Json
    `;
    const res = await runPowerShell(script);
    if (!res) return [];
    
    const parsed = JSON.parse(res);
    // Unify to array if JSON returns a single object
    const devices = Array.isArray(parsed) ? parsed : [parsed];
    
    // Clean up names (e.g., "Kulaklıklar (Realtek(R) Audio)" -> "Kulaklıklar")
    return devices.map((d: any) => ({
       Index: d.Index,
       Name: d.Name.split(" (")[0], 
       Default: d.Default
    }));
  } catch (e) {
    console.error("Audio Devices fetch failed:", e);
    return [];
  }
}

export async function setAudioDevice(index: number): Promise<void> {
  const script = `
    Import-Module ./AudioDeviceCmdlets.dll -ErrorAction SilentlyContinue;
    Set-AudioDevice -Index ${index}
  `;
  await runPowerShell(script);
}

/**
 * SET BRIGHTNESS (0-100)
 */
export async function setBrightness(level: number): Promise<void> {
  const b = Math.max(0, Math.min(100, level));
  try {
    await runPowerShell(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${b})`);
  } catch (e) {
    console.warn("WMI Brightness set failed.");
  }
}

/**
 * GET BRIGHTNESS (0-100)
 */
export async function getBrightness(): Promise<number> {
  try {
    const result = await runPowerShell("(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness");
    return parseInt(result) || 50;
  } catch (e) {
    return 50;
  }
}

/**
 * POWER ACTIONS
 */
export async function executePowerAction(action: PowerAction): Promise<void> {
  switch (action) {
    case "shutdown":
      await runPowerShell("stop-computer -force");
      break;
    case "restart":
      await runPowerShell("restart-computer -force");
      break;
    case "sleep":
      await runPowerShell("Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $true)");
      break;
    case "hibernate":
      await runPowerShell("Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Hibernate', $false, $true)");
      break;
    case "lock":
      await runPowerShell("rundll32.exe user32.dll,LockWorkStation");
      break;
  }
}

/**
 * MEDIA CONTROLS
 */
export async function mediaControl(action: "playpause" | "next" | "prev"): Promise<void> {
  const keys: Record<string, number> = {
    playpause: 179,
    next: 176,
    prev: 177,
  };
  await runPowerShell(`(new-object -com wscript.shell).SendKeys([char]${keys[action]})`);
}

/**
 * SYSTEM INFO METRICS
 */
export async function getDiskUsage() {
  const disks = await si.fsSize();
  // Filter for common Windows fixed drives (C:, D:, etc.)
  return disks
    .filter(d => d.mount.match(/^[A-Z]:$/i) || d.type.toLowerCase().includes("fixed") || d.type === "NTFS")
    .map(d => ({
      mount: d.mount,
      total: Math.round(d.size / (1024 ** 3)),
      used: Math.round(d.used / (1024 ** 3)),
      percentage: Math.round(d.use),
    }));
}

export async function getTempInfo() {
  try {
    const temp = await si.cpuTemperature();
    return temp.main || 0;
  } catch (e) {
    return 0;
  }
}

export async function getNetworkSpeed() {
  try {
    const stats = await si.networkStats();
    const active = stats.find(s => s.operstate === "up") || stats[0];
    return {
      rx: Math.round((active?.rx_sec || 0) / 1024), // KB/s
      tx: Math.round((active?.tx_sec || 0) / 1024), // KB/s
    };
  } catch (e) {
    return { rx: 0, tx: 0 };
  }
}

export async function getWifiSignal(): Promise<number> {
  try {
    const res = await runPowerShell("(netsh wlan show interfaces) | Select-String 'Signal'");
    const match = res.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 100; // 100 as fallback if wired
  } catch (e) {
    return 100;
  }
