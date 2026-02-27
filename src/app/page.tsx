

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
    }, 20);
  };

  const handleMouseClick = (b: string) => executeControl("mouse", b);

  const handleKeyboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbInput) return;
    await executeControl("keyboard", kbInput);
    setKbInput("");
  };

  const handleCaptureScreenshot = async () => {
    if (!isUnlocked) return toast.error("System Locked");
    setIsCapturing(true);
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "screenshot" }),
      });
      const data = await res.json();
      if (data.output) setScreenshot(data.output);
    } catch (e) {
      toast.error("Failed to capture screen");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClipboard = async (action: "get" | "set") => {
    if (!isUnlocked) return toast.error("System Locked");
    try {
      if (action === "get") {
        const res = await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-clipboard" }),
        });
        const data = await res.json();
        setClipInput(data.output || "");
        toast.success("Clipboard pulled from PC");
      } else {
        await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set-clipboard", value: clipInput }),
        });
        toast.success("Clipboard pushed to PC");
      }
    } catch (e) {
      toast.error("Clipboard sync failed");
    }
  };

  const handleUrlPush = async () => {
    if (!isUnlocked) return toast.error("System Locked");
    if (!urlInput.trim()) return;
    try {
      await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open-url", value: urlInput }),
      });
      setUrlInput("");
      toast.success("URL pushed to PC browser");
    } catch (e) {
      toast.error("URL push failed");
    }
  };

  const handleShutdownTimer = async (val: number | "cancel") => {
    if (!isUnlocked) return toast.error("System Locked");
    try {
      await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "shutdown-timer", value: val }),
      });
      if (val === "cancel") toast.success("Shutdown cancelled");
      else toast.success(`Shutdown scheduled in ${val} minutes`);
    } catch (e) {
      toast.error("Timer setup failed");
    }
  };

  const handleStickyNote = async () => {
    if (!isUnlocked) return toast.error("System Locked");
    if (!stickyInput.trim()) return;
    try {
      await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sticky-note", value: stickyInput }),
      });
      setStickyInput("");
      toast.success("Sticky note sent to PC");
    } catch (e) {
      toast.error("Sticky note failed");
    }
  };

  const handleVoiceCommand = () => {
    if (!isUnlocked) return toast.error("System Locked");
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      toast.error("Speech Recognition not supported on this browser.");
      return;
    }

    const recognition = new Speech();
    recognition.lang = "tr-TR";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = async (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      toast.info(`Heard: "${command}"`);

      // Simple Command Mapping
      if (command.includes("youtube") || command.includes("izle")) {
        const query = command.replace(/youtube|da|de|izle|aç|arattır/g, "").trim();
        await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "open-url", value: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` }),
        });
      } else if (command.includes("google") || command.includes("ara")) {
        const query = command.replace(/google|da|de|ara|arattır/g, "").trim();
        await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "open-url", value: `https://www.google.com/search?q=${encodeURIComponent(query)}` }),
        });
      } else if (command.includes("uyku") || command.includes("kapat")) {
        handlePower("sleep");
      } else if (command.includes("müzik") || command.includes("şarkı")) {
        sendControl("media", "playpause");
      }
    };

    recognition.start();
  };

  if (loading && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="h-24 w-24 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-indigo-500">
            Scanning
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-zinc-100 p-4 md:p-8 selection:bg-indigo-500/30 font-inter overflow-x-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8">

        <main className="space-y-6 md:space-y-8">
          {/* Header Section */}
          <header className={cn(
            "flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-3xl relative group transition-all duration-300",
            showQR ? "z-[60]" : "z-10"
          )}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none rounded-[2.5rem]" />
            <div className="flex items-center gap-6 relative">
              <div className="relative">
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                  <Monitor className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050507] animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight font-sora">{status?.hostname || "Workstation"}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800/50 border border-white/5 text-[10px] font-bold text-zinc-400 whitespace-nowrap">
                    <Wifi className="w-3 h-3 text-primary" />
                    {status?.ip || "Local Node"}
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800/50 border border-white/5 text-[10px] font-bold text-zinc-400 whitespace-nowrap">
                    <Tally3 className="w-3 h-3 text-primary" />
                    UPTIME: {Math.floor((status?.uptime || 0) / 3600)}H
                  </div>
                </div>
              </div>
