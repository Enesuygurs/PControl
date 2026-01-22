

import { spawn } from "child_process";
import si from "systeminformation";

export type PowerAction = "sleep" | "shutdown" | "restart" | "hibernate" | "lock";
