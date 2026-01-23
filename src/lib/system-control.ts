

import { spawn } from "child_process";
import si from "systeminformation";

export type PowerAction = "sleep" | "shutdown" | "restart" | "hibernate" | "lock";

/**
 * Persistent PowerShell bridge to avoid sub-process startup lag (approx 150ms).
 */
class PowerShellBridge {
