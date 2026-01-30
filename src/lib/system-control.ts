

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
