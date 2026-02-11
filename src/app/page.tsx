

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Monitor,
  Volume2,
  VolumeX,
  Sun,
  Power,
  RotateCcw,
  Moon,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Cpu,
  Tally3,
  Wifi,
  Activity,
  HardDrive,
  Thermometer,
  Lock,
  Unlock,
  ExternalLink,
  Terminal,
  Eraser,
  Search,
  Settings,
  XCircle,
  QrCode,
  MousePointer2,
  Keyboard as KeyboardIcon,
  Battery,
  BatteryCharging,
  Clipboard,
  Image as ImageIcon,
  Zap,
  RefreshCw,
  Skull,
  Music,
  PlayCircle,
  Command,
  Rocket,
  Database,
  Link,
  Timer,
  CircleOff,
  Shield,
  ShieldAlert,
  Mic,
  StickyNote as NoteIcon,
  AlertTriangle,
  FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FileExplorer from "@/components/FileExplorer";

interface SystemStatus {
  cpu: number;
  memory: number;
  brightness: number;
  volume: number;
  isMuted: boolean;
  disk: {
    mount: string;
    total: number;
    used: number;
    percentage: number;
  }[];
  temp: number;
  hostname: string;
  ip: string;
  uptime: number;
  rxSpeed: number;
  txSpeed: number;
  wifi: number;
  audioDevices?: { Index: number; Name: string; Default: boolean }[];
  media: {
    Title: string;
    Artist: string;
  } | null;
  battery: { percentage: number; isCharging: boolean } | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ControlPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [powerAction, setPowerAction] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  const [kbInput, setKbInput] = useState("");
  const [clipInput, setClipInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [stickyInput, setStickyInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cmdLog, setCmdLog] = useState<{ cmd: string; output: string }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinPad, setShowPinPad] = useState(false);

  const lastMousePos = useRef<{ x: number, y: number } | null>(null);
  const mouseThrottle = useRef<any>(null);
  const debounceRef = useRef<any>(null);

  // Tap-to-click tracking
  const touchStartInfo = useRef<{ time: number; x: number; y: number; maxFingers: number; isMove: boolean } | null>(null);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Status error");
      const data = await res.json();
      setStatus(data);
      if (isManual) toast.success("System status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    if (typeof window !== "undefined" && localStorage.getItem("pcontrol_unlocked") === "true") {
      setIsUnlocked(true);
    }
  }, [fetchStatus]);

  const sendControl = async (action: string, value?: any, debounce = false) => {
    if (!isUnlocked) return toast.error("System Locked");
    // Optimistic Update: Hemen yansıt ki kullanıcı slider'da gecikme hissetmesin
    if (status) {
      if (action === "volume") setStatus({ ...status, volume: value });
      if (action === "brightness") setStatus({ ...status, brightness: value });
      if (action === "mute") setStatus({ ...status, isMuted: value });
    }

    if (debounce) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await executeControl(action, value);
      }, 1000); // Gecikmeyi 1 saniyeye çıkarttım ki kesin tek komut gitsin
    } else {
      await executeControl(action, value);
    }
  };

  const executeControl = async (action: string, value?: any) => {
    if (!isUnlocked) return toast.error("System Locked");
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value }),
      });
      if (!res.ok) throw new Error("Control error");

      toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} synchronized`, {
        description: value !== undefined ? `Value: ${value}` : undefined,
        duration: 1500
      });
    } catch (err) {
      toast.error("Failed to sync system state");
    }
  };

  const handlePower = async (action: string) => {
    if (powerAction === action) {
      await sendControl("power", action);
      setPowerAction(null);
    } else {
      setPowerAction(action);
      setTimeout(() => setPowerAction(null), 3000);
    }
  };

  const handleTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUnlocked) return toast.error("System Locked");
    if (!cmdInput.trim() || isExecuting) return;

    setIsExecuting(true);
    const currentCmd = cmdInput;
    setCmdInput("");

    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cmd", value: currentCmd }),
      });
      const data = await res.json();
      setCmdLog(prev => [{ cmd: currentCmd, output: data.output || "No output" }, ...prev].slice(0, 10));
    } catch (err) {
      setCmdLog(prev => [{ cmd: currentCmd, output: "Execution failed" }, ...prev].slice(0, 10));
    } finally {
      setIsExecuting(false);
    }
  };

  const accumulatedMove = useRef({ dx: 0, dy: 0 });

  const isMoving = useRef(false);

  const handleMouseMove = (dx: number, dy: number) => {
    if (!isUnlocked) return;
    accumulatedMove.current.dx += dx;
    accumulatedMove.current.dy += dy;

    if (isMoving.current) return;

    isMoving.current = true;
    setTimeout(async () => {
      const sendX = Math.round(accumulatedMove.current.dx);
      const sendY = Math.round(accumulatedMove.current.dy);
      accumulatedMove.current = { dx: 0, dy: 0 };

      if (Math.abs(sendX) > 0 || Math.abs(sendY) > 0) {
        await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mouse", value: { dx: sendX, dy: sendY } }),
          keepalive: true
        });
      }
      isMoving.current = false;
