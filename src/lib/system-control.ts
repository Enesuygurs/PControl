

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
