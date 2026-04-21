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
  ShieldCheck,
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
  const [isSetupMode, setIsSetupMode] = useState(false);

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

    // Check if PIN is configured
    async function checkAuthStatus() {
      try {
        const res = await fetch("/api/auth/check");
        const data = await res.json();
        if (!data.configured) {
          setIsSetupMode(true);
          setShowPinPad(true);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      }
    }
    checkAuthStatus();
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
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4 relative w-full md:w-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (isUnlocked) {
                      setIsUnlocked(false);
                      setShowPinPad(false);
                      if (typeof window !== "undefined") localStorage.removeItem("pcontrol_unlocked");
                      toast.success("System Locked");
                    } else {
                      setShowPinPad(!showPinPad);
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all shadow-lg",
                    isUnlocked
                      ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                      : showPinPad
                        ? "bg-red-500/10 border-red-500/20 text-red-500 ring-2 ring-red-500/20"
                        : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:text-red-500"
                  )}
                  title={isUnlocked ? "Lock System" : "Unlock System"}
                >
                  {isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className={cn(
                      "p-4 rounded-2xl bg-zinc-800/50 border border-white/5 text-zinc-400 hover:text-primary transition-all shadow-lg",
                      showQR && "bg-primary/10 text-primary border-primary/20 ring-2 ring-primary/20"
                    )}
                  >
                    <QrCode className="w-6 h-6" />
                  </button>

                  <AnimatePresence>
                    {showQR && status?.ip && (
                      <>
                        {/* Mobile Backdrop for fixed modal */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowQR(false)}
                          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] md:hidden"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:top-20 md:right-0 p-6 rounded-[2.5rem] bg-zinc-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] md:w-64 space-y-4 backdrop-blur-2xl"
                        >
                          <div className="p-4 bg-white rounded-3xl flex justify-center shadow-inner">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=http://${status.ip}:3000`}
                              alt="QR Access"
                              className="w-40 h-40"
                            />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm font-bold font-sora text-white">Mobile Terminal Access</p>
                            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Scan this QR while on the same Wi-Fi network to connect.</p>
                          </div>
                          <button
                            onClick={() => setShowQR(false)}
                            className="w-full py-3 rounded-2xl bg-zinc-800 text-[10px] font-bold text-zinc-400 md:hidden"
                          >
                            Close Menu
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => fetchStatus(true)}
                  disabled={refreshing}
                  className={cn(
                    "p-4 rounded-2xl bg-zinc-800/50 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-lg",
                    refreshing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RotateCcw className={cn("w-6 h-6", refreshing && "animate-spin")} />
                </button>
              </div>

              <div className="flex items-center gap-2 md:gap-4 pr-2 md:pr-0">
                <div className="h-8 w-px bg-white/5" />
                <div className="text-right whitespace-nowrap">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Status</p>
                  <p className="text-sm font-black text-primary leading-tight">ACTIVE NODE</p>
                </div>
              </div>
            </div>
          </header>

          {/* Stats Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            <MetricCard icon={<Cpu />} label="CPU LOAD" value={`${status?.cpu || 0}%`} progress={status?.cpu || 0} color="primary" />
            <MetricCard icon={<Activity />} label="MEMORY" value={`${status?.memory || 0}%`} progress={status?.memory || 0} color="purple" />
            <MetricCard
              icon={<Wifi />}
              label="WIFI SIGNAL"
              value={`${status?.wifi || 0}%`}
              progress={status?.wifi || 0}
              color="pink"
            />
            <MetricCard
              icon={status?.battery?.isCharging ? <BatteryCharging className="text-emerald-400" /> : <Battery />}
              label="BATTERY"
              value={status?.battery ? `${status.battery.percentage}%` : "N/A"}
              progress={status?.battery?.percentage || 0}
              color={status?.battery?.isCharging ? "emerald" : "orange"}
            />
          </motion.div>

          {/* Storage Management Section */}
          <section className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-8 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold font-sora">Storage Management</h3>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Active System Drives</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {status?.disk.map((d, i) => (
                <div key={i} className="p-6 rounded-[2rem] bg-zinc-950/40 border border-white/5 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter mb-1">Drive {d.mount}</p>
                      <h4 className="text-xl font-bold font-sora text-white">{d.used} GB <span className="text-xs text-zinc-500">OF {d.total} GB</span></h4>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">{d.total - d.used} GB FREE SPACE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black font-sora text-cyan-400">{d.percentage}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Remote Input Section */}
          <div className={cn("grid lg:grid-cols-[1fr_300px] gap-6 md:gap-8 transition-all duration-700 relative", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
            <div className="p-6 md:p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <MousePointer2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold font-sora">Precision Touchpad</h3>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => handleMouseClick("left")} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/5 text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary transition-all">Left Click</button>
                  <button onClick={() => handleMouseClick("right")} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/5 text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary transition-all">Right Click</button>
                </div>
              </div>

              <div
                className="h-64 rounded-[2.5rem] bg-zinc-950/40 border-2 border-dashed border-white/5 flex items-center justify-center relative active:border-primary/20 transition-colors cursor-crosshair touch-none select-none"
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  lastMousePos.current = { x: t.clientX, y: t.clientY };
                  touchStartInfo.current = {
                    time: Date.now(),
                    x: t.clientX,
                    y: t.clientY,
                    maxFingers: e.touches.length,
                    isMove: false
                  };
                }}
                onTouchMove={(e) => {
                  const t = e.touches[0];
                  if (touchStartInfo.current) {
                    const totalDx = Math.abs(t.clientX - touchStartInfo.current.x);
                    const totalDy = Math.abs(t.clientY - touchStartInfo.current.y);
                    if (totalDx > 10 || totalDy > 10) touchStartInfo.current.isMove = true;
                    if (e.touches.length > touchStartInfo.current.maxFingers) {
                      touchStartInfo.current.maxFingers = e.touches.length;
                    }
                  }

                  if (lastMousePos.current) {
                    const dx = (t.clientX - lastMousePos.current.x) * 2.5;
                    const dy = (t.clientY - lastMousePos.current.y) * 2.5;
                    handleMouseMove(dx, dy);
                  }
                  lastMousePos.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchEnd={(e) => {
                  if (touchStartInfo.current && !touchStartInfo.current.isMove) {
                    const duration = Date.now() - touchStartInfo.current.time;
                    if (duration < 250) {
                      if (touchStartInfo.current.maxFingers === 1) handleMouseClick("left");
                      else if (touchStartInfo.current.maxFingers === 2) handleMouseClick("right");
                    }
                  }
                  lastMousePos.current = null;
                  touchStartInfo.current = null;
                }}
              >
                <div className="text-center opacity-20 group-active:opacity-40 transition-opacity">
                  <MousePointer2 className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Direct Motion Control</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <KeyboardIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-sora">Remote Typing</h3>
              </div>

              <form onSubmit={handleKeyboard} className="space-y-4">
                <textarea
                  value={kbInput}
                  onChange={(e) => setKbInput(e.target.value)}
                  placeholder="Type text to send..."
                  className="w-full h-32 bg-zinc-950/50 border border-white/10 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-indigo-500/50 transition-all resize-none custom-scrollbar"
                />
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-[0_10px_30px_rgba(99,102,241,0.2)]"
                >
                  Send Keystrokes
                </button>
              </form>
              <p className="text-[9px] text-zinc-500 text-center leading-relaxed">
                Text will be transmitted to the active window on your computer. Supports special chars and line breaks.
              </p>
            </div>
          </div>

          <div className={cn("grid lg:grid-cols-[2fr_1fr] gap-8 transition-all duration-700 relative", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
            {/* Clipboard Hub */}
            <div className="p-6 md:p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Clipboard className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold font-sora">Sync Clipboard</h3>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleClipboard("get")}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/5 text-[10px] font-black uppercase hover:bg-amber-500/10 hover:text-amber-500 transition-all"
                  >
                    Pull from PC
                  </button>
                  <button
                    onClick={() => handleClipboard("set")}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/5 text-[10px] font-black uppercase hover:bg-amber-500/10 hover:text-amber-500 transition-all"
                  >
                    Push to PC
                  </button>
                </div>
              </div>

              <textarea
                value={clipInput}
                onChange={(e) => setClipInput(e.target.value)}
                placeholder="Paste here to send to PC, or pull to see PC clipboard..."
                className="w-full h-24 bg-zinc-950/50 border border-white/10 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-amber-500/50 transition-all resize-none custom-scrollbar"
              />
            </div>

            {/* Screen Capture Hub */}
            <div className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md flex flex-col items-center justify-center text-center group">
              <div className="p-4 rounded-3xl bg-zinc-950/50 border border-white/5 mb-2 group-hover:border-primary/20 transition-all">
                <ImageIcon className="w-8 h-8 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h3 className="font-bold font-sora text-sm mb-1">Visual Monitoring</h3>
                <p className="text-[10px] text-zinc-500 font-medium px-4">Instant high-def screenshot of your primary display.</p>
              </div>
              <button
                onClick={handleCaptureScreenshot}
                disabled={isCapturing}
                className="mt-4 px-8 py-3 rounded-2xl bg-zinc-800/80 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-50"
              >
                {isCapturing ? "Capturing..." : "View Remote Screen"}
              </button>
            </div>
          </div>

          <div className={cn("grid lg:grid-cols-2 gap-8 transition-all duration-700 relative", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
            {/* URL Pusher */}
            <div className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Link className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-sora">URL Pusher</h3>
              </div>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste YouTube or website link..."
                  className="flex-1 bg-zinc-950/50 border border-white/10 rounded-2xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  onClick={handleUrlPush}
                  className="px-6 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest"
                >
                  Push
                </button>
              </div>
            </div>

            {/* Shutdown Timer */}
            <div className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                  <Timer className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-sora">Auto-Shutdown Timer</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 120].map(m => (
                  <button
                    key={m}
                    onClick={() => handleShutdownTimer(m)}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-800/50 border border-white/5 hover:border-red-500/20 hover:bg-red-500/5 transition-all group"
                  >
                    <span className="text-xs font-bold font-sora">{m}</span>
                    <span className="text-[8px] text-zinc-500 font-black uppercase group-hover:text-red-400">MINS</span>
                  </button>
                ))}
                <button
                  onClick={() => handleShutdownTimer("cancel")}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-950/50 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <CircleOff className="w-4 h-4 mb-1" />
                  <span className="text-[8px] font-black uppercase">CANCEL</span>
                </button>
              </div>
            </div>
          </div>

          <div className={cn("grid lg:grid-cols-2 gap-8 transition-all duration-700 relative", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
            {/* Sticky Note Hub */}
            <div className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500">
                    <NoteIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold font-sora">PC Sticky Note</h3>
                </div>
                <button
                  onClick={handleStickyNote}
                  className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/5 text-[10px] font-black uppercase hover:bg-yellow-500/10 hover:text-yellow-500 transition-all"
                >
                  Send Note
                </button>
              </div>
              <textarea
                value={stickyInput}
                onChange={(e) => setStickyInput(e.target.value)}
                placeholder="Type a message to show on PC screen..."
                className="w-full h-24 bg-zinc-950/50 border border-white/10 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-yellow-500/50 transition-all resize-none custom-scrollbar"
              />
            </div>

            {/* Voice AI Hub */}
            <div className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-6 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-sora">Voice Interaction</h3>
              </div>

              <button
                onClick={handleVoiceCommand}
                className={cn(
                  "w-full flex items-center justify-center gap-3 p-10 rounded-3xl border transition-all group",
                  isListening ? "bg-primary border-primary animate-pulse" : "bg-zinc-950/50 border-white/5 hover:border-primary/30"
                )}
              >
                <Mic className={cn("w-10 h-10", isListening ? "text-white" : "text-primary")} />
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-widest text-white">Voice Command Center</p>
                  <p className="text-[9px] text-zinc-500 font-medium">{isListening ? "Listening your command..." : "Tap to Speak (Turkish)"}</p>
                </div>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {screenshot && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col p-4 md:p-12"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <Monitor className="w-6 h-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-bold font-sora leading-tight">Remote View</h2>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Live Capture Node</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setScreenshot(null)}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all self-end sm:self-auto"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center">
                  <img
                    src={`data:image/jpeg;base64,${screenshot}`}
                    alt="Remote Screen"
                    className="max-w-full max-h-full object-contain shadow-2xl"
                  />
                </div>
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleCaptureScreenshot}
                    className="px-8 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(245,158,11,0.3)]"
                  >
                    Refresh Capture
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Controls */}
          <div className={cn("grid lg:grid-cols-2 gap-8 transition-all duration-700 relative", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
            <section className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-8 backdrop-blur-md flex flex-col">
              <div className="flex items-center justify-between min-h-[72px]">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold font-sora">System Volume</h3>
                    <p className="text-xs text-zinc-500 font-medium">Output intensity</p>
                  </div>
                </div>
                <button
                  onClick={() => sendControl("mute", !status?.isMuted)}
                  className={cn(
                    "p-4 rounded-2xl transition-all border",
                    status?.isMuted
                      ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  {status?.isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>

              <div className="flex-1 space-y-8">
                <ControlSlider
                  value={status?.volume || 0}
                  onChange={(v: number) => sendControl("volume", v, false)}
                  color="primary"
                  label={`${status?.volume}%`}
                />

                <div className="grid grid-cols-4 gap-3">
                  {[0, 25, 50, 100].map(v => (
                    <QuickValue key={v} value={v} onClick={() => sendControl("volume", v)} active={status?.volume === v} />
                  ))}
                </div>

                {/* Audio Output Router */}
                {status?.audioDevices && status.audioDevices.length > 0 && (
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-zinc-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audio Routing</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {status.audioDevices.map((device) => (
                        <button
                          key={device.Index}
                          onClick={() => {
                            executeControl("set-audio-device", device.Index);
                            setTimeout(() => fetchStatus(true), 1500); // Wait for windows to apply and refresh
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                            device.Default
                              ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                              : "bg-zinc-800/30 border-white/5 hover:bg-zinc-800/50 hover:border-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", device.Default ? "bg-primary shadow-[0_0_10px_rgba(245,158,11,1)]" : "bg-zinc-600")} />
                            <span className={cn("text-xs font-bold font-sora", device.Default ? "text-primary" : "text-zinc-400")}>
                              {device.Name}
                            </span>
                          </div>
                          {device.Default && <span className="text-[8px] font-black uppercase tracking-widest text-primary/70">Active</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="p-8 rounded-[3rem] bg-zinc-900/20 border border-white/5 space-y-8 backdrop-blur-md flex flex-col">
              <div className="flex items-center justify-between min-h-[72px]">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold font-sora">Screen Brightness</h3>
                    <p className="text-xs text-zinc-500 font-medium">Panel backlight</p>
                  </div>
                </div>
                <button
                  onClick={() => sendControl("brightness", status?.brightness === 100 ? 0 : 100)}
                  className={cn(
                    "p-4 rounded-2xl transition-all border bg-zinc-800/50 border-white/5 text-zinc-400 hover:text-amber-500 hover:border-amber-500/20 hover:bg-amber-500/10"
                  )}
                >
                  <Sun className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 space-y-8">
                <ControlSlider
                  value={status?.brightness || 0}
                  onChange={(v: number) => sendControl("brightness", v, false)}
                  color="amber"
                  label={`${status?.brightness}%`}
                />

                <div className="grid grid-cols-4 gap-3">
                  {[0, 50, 75, 100].map(v => (
                    <QuickValue key={v} value={v} onClick={() => sendControl("brightness", v)} active={status?.brightness === v} />
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Quick Hub */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className={cn("h-full transition-all duration-700", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
              <ControlSection title="Launch" icon={<ExternalLink className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <AppHubButton icon={<Terminal />} label="CMD" onClick={() => sendControl("launch", "cmd")} />
                  <AppHubButton icon={<Activity />} label="Task" onClick={() => sendControl("launch", "taskmgr")} />
                  <AppHubButton icon={<Search />} label="Web" onClick={() => sendControl("launch", "browser")} />
                  <AppHubButton icon={<FolderOpen />} label="Files" onClick={() => setShowFileExplorer(true)} />
                </div>
              </ControlSection>
            </div>

            <div className={cn("h-full transition-all duration-700", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
              <ControlSection title="Media Center" icon={<Play className="w-4 h-4" />}>
                <div className="flex flex-col justify-between h-full py-2">
                  <div className="bg-zinc-800/30 p-4 rounded-2xl border border-white/5 mb-4 text-center">
                    <p className="text-sm font-bold font-sora text-white truncate">{status?.media?.Title || "No Media Native"}</p>
                    <p className="text-[10px] font-medium text-zinc-500 truncate">{status?.media?.Artist || "System idle"}</p>
                  </div>
                  <div className="flex items-center justify-between px-4">
                    <MediaCtrl icon={<SkipBack />} onClick={() => sendControl("media", "prev")} />
                    <MediaCtrl icon={<Play className="fill-current w-6 h-6" />} highlight onClick={() => sendControl("media", "playpause")} />
                    <MediaCtrl icon={<SkipForward />} onClick={() => sendControl("media", "next")} />
                  </div>
                </div>
              </ControlSection>
            </div>

            <div className={cn("h-full transition-all duration-700", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
              <ControlSection title="Terminal" icon={<Terminal className="w-4 h-4" />}>
                <div className="flex flex-col h-full space-y-3">
                  <form onSubmit={handleTerminal} className="relative group">
                    <input
                      type="text"
                      value={cmdInput}
                      onChange={(e) => setCmdInput(e.target.value)}
                      placeholder="Run remote command..."
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-primary/50 transition-all pr-12"
                    />
                    <button
                      type="submit"
                      disabled={isExecuting}
                      className="absolute right-2 top-1.5 p-1.5 text-zinc-500 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </form>
                  <div className="flex-1 bg-zinc-950/80 rounded-xl p-3 font-mono text-[9px] overflow-hidden group">
                    <div className="h-24 overflow-y-auto space-y-2 no-scrollbar">
                      {cmdLog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-20">
                          <Terminal className="w-6 h-6 mb-2" />
                          <p>Ready for input</p>
                        </div>
                      ) : (
                        cmdLog.map((log, i) => (
                          <div key={i} className="border-b border-white/5 pb-2 last:border-0">
                            <p className="text-primary opacity-80 mb-1">$ {log.cmd}</p>
                            <pre className="text-zinc-400 whitespace-pre-wrap leading-relaxed">{log.output}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </ControlSection>
            </div>
          </div>
        </main>

        {/* Sidebar / Power Section */}
        <aside className={cn("space-y-6 transition-all duration-700 relative w-full", !isUnlocked && "blur-[10px] pointer-events-none opacity-40 select-none grayscale z-0")}>
          <div className="p-8 rounded-[3rem] bg-indigo-600/10 border border-indigo-500/20 backdrop-blur-xl relative overflow-hidden group h-fit">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Power className="w-32 h-32 rotate-12" />
            </div>
            <h2 className="text-xl font-bold font-sora mb-1 relative">Power Hub</h2>
            <p className="text-xs text-indigo-300 font-medium mb-8 relative">System state management</p>

            <div className="space-y-4 relative">
              <FullPowerButton
                icon={<Moon />}
                label="Enter Sleep Mode"
                desc="Suspend to low-power"
                active={powerAction === "sleep"}
                onClick={() => handlePower("sleep")}
                color="indigo"
              />
              <FullPowerButton
                icon={<RotateCcw />}
                label="Reboot System"
                desc="Restart all services"
                active={powerAction === "restart"}
                onClick={() => handlePower("restart")}
                color="amber"
              />
              <FullPowerButton
                icon={<Power />}
                label="Fatal Shutdown"
                desc="Kill all processes"
                active={powerAction === "shutdown"}
                onClick={() => handlePower("shutdown")}
                color="red"
              />
            </div>
          </div>

        </aside>

        <AnimatePresence>
          {showFileExplorer && isUnlocked && (
            <FileExplorer onClose={() => setShowFileExplorer(false)} />
          )}
        </AnimatePresence>
      </div>

      <footer className="max-w-7xl mx-auto mt-12 py-8 border-t border-white/5 flex justify-between items-center text-zinc-600 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Antigravity Node Interface</p>
        <p className="text-[10px] font-bold">V2.4.0 • STABLE BUILD</p>
      </footer>

      {!isUnlocked && showPinPad && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Full-screen opaque blur backdrop */}
          <div className="absolute inset-0 bg-[#050507]/95 backdrop-blur-[40px]" />
          <div className="relative p-8 rounded-[3rem] bg-zinc-950/90 border border-red-500/30 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center w-full max-w-sm z-10">
            {!isSetupMode && (
              <button onClick={() => setShowPinPad(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            )}
            <div className={cn("p-4 rounded-3xl mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]", isSetupMode ? "bg-primary/10" : "bg-red-500/10")}>
              {isSetupMode ? <ShieldCheck className="w-8 h-8 text-primary" /> : <Lock className="w-8 h-8 text-red-500" />}
            </div>
            <h2 className="text-xl font-bold font-sora text-white mb-2">{isSetupMode ? "INITIAL SECURITY SETUP" : "CLASSIFIED CLEARANCE"}</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center mb-8">
              {isSetupMode ? "Create a 4-digit PIN to secure your dashboard" : "Enter PIN to access advanced system controls"}
            </p>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              try {
                const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pinInput }) });
                const data = await res.json();
                if (res.ok) { 
                  if (isSetupMode) {
                    setIsSetupMode(false);
                    toast.success('Security PIN Created Successfully');
                  } else {
                    setIsUnlocked(true); 
                    setShowPinPad(false); 
                    if (typeof window !== "undefined") localStorage.setItem("pcontrol_unlocked", "true"); 
                    toast.success('Security Clearance Granted'); 
                  }
                  setPinInput('');
                } else { 
                  setPinInput(''); 
                  if (res.status === 401) {
                    toast.error('Access Denied: Invalid PIN'); 
                  } else {
                    toast.error(data.error || 'Authentication Error');
                  }
                }
              } catch (err) {
                toast.error('Authentication Error');
              }
            }} className="flex flex-col items-center w-full">
              <div className="relative w-full group">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10 block"
                  autoFocus
                  autoComplete="off"
                />
                <div className="flex items-center justify-center gap-6 bg-zinc-900/50 border border-white/10 group-focus-within:border-red-500/50 rounded-2xl py-6 transition-all">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={cn("w-3 h-3 rounded-full transition-all duration-300", pinInput.length > i ? "bg-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "bg-white/10 scale-100")} />
                  ))}
                </div>
              </div>
              <button type="submit" className={cn("mt-4 w-full py-4 rounded-2xl transition-colors text-white text-[10px] font-black uppercase tracking-widest shadow-lg", isSetupMode ? "bg-primary hover:bg-primary/80 shadow-primary/20" : "bg-red-500 hover:bg-red-600 shadow-red-500/20")}>
                {isSetupMode ? "Initialize Dashboard" : "Authenticate"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function MetricCard({ icon, label, value, progress, color }: any) {
  const colors: any = {
    primary: "from-primary to-primary shadow-primary/20",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/20",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/20",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
    red: "from-red-500 to-red-600 shadow-red-500/20",
    cyan: "from-cyan-400 to-cyan-500 shadow-cyan-400/20",
    blue: "from-blue-500 to-blue-600 shadow-blue-500/20",
    pink: "from-pink-500 to-rose-500 shadow-pink-500/20",
  };

  const textColors: any = {
    primary: "text-primary",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
    orange: "text-orange-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
    blue: "text-blue-400",
    pink: "text-pink-400",
  };

  return (
    <motion.div variants={item} className="p-6 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-md relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(textColors[color])}>
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      <div className="text-3xl font-black font-sora mb-4">{value}</div>
      <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full bg-gradient-to-r shadow-lg", colors[color])}
        />
      </div>
    </motion.div>
  );
}

function ControlSlider({ value, onChange, color, label }: any) {
  const colors: any = {
    indigo: "bg-indigo-500",
    amber: "bg-amber-500",
    primary: "bg-primary",
  };

  const [localValue, setLocalValue] = useState(value);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handlePointerUp = () => {
    isDragging.current = false;
    onChange(localValue);
  };

  return (
    <div className="space-y-4">
      <div className="relative h-16 bg-zinc-800/30 rounded-2xl overflow-hidden cursor-pointer group border border-white/5">
        <motion.div
          initial={false}
          animate={{ width: `${localValue}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className={cn("absolute inset-y-0 left-0 opacity-80", colors[color])}
        />
        <input
          type="range"
          min="0" max="100"
          value={localValue}
          onPointerDown={() => { isDragging.current = true; }}
          onChange={(e) => setLocalValue(parseInt(e.target.value))}
          onPointerUp={handlePointerUp}
          onTouchEnd={handlePointerUp}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
          <span className="text-xs font-black uppercase tracking-widest text-white/40">Drill to Adjust</span>
          <span className="text-xl font-black text-white">{label ? label.replace(value, localValue) : `${localValue}%`}</span>
        </div>
      </div>
    </div>
  );
}

function QuickValue({ value, onClick, active }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border",
        active
          ? "bg-indigo-500 border-indigo-500 text-white shadow-lg"
          : "bg-zinc-800/30 border-white/5 text-zinc-500 hover:bg-zinc-800"
      )}
    >
      {value}%
    </button>
  );
}

function ActionButton({ icon, label }: any) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
      {icon} {label}
    </button>
  );
}

function ControlSection({ title, icon, children }: any) {
  return (
    <div className="p-6 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="text-indigo-500">{icon}</div>
        <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500">{title}</h3>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function AppHubButton({ icon, label, onClick, variant }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-4 rounded-3xl border transition-all",
        variant === "danger"
          ? "bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/10"
          : "bg-zinc-800/20 border-white/5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/5 hover:border-indigo-500/10"
      )}
    >
      <div className="opacity-50 group-hover:opacity-100">{icon}</div>
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function MediaCtrl({ icon, highlight, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl transition-all",
        highlight
          ? "bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.4)]"
          : "text-zinc-500 hover:text-white"
      )}
    >
      {icon}
    </button>
  );
}

function FullPowerButton({ icon, label, desc, active, onClick, color }: any) {
  const colors: any = {
    indigo: active ? "border-indigo-500 bg-indigo-500/10 text-indigo-100" : "hover:border-indigo-500/50 hover:bg-indigo-500/5",
    amber: active ? "border-amber-500 bg-amber-500/10 text-amber-100" : "hover:border-amber-500/50 hover:bg-amber-500/5",
    red: active ? "border-red-500 bg-red-500/10 text-red-100" : "hover:border-red-500/50 hover:bg-red-500/5",
  };

  const ringColors: any = {
    indigo: "text-indigo-500",
    amber: "text-amber-500",
    red: "text-red-500",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-5 p-5 rounded-[2rem] border border-white/5 transition-all text-left group",
        colors[color]
      )}
    >
      <div className={cn(
        "p-4 rounded-2xl bg-zinc-800/50 transition-all",
        active ? "bg-white text-black" : `group-hover:${ringColors[color]} group-hover:bg-opacity-20`
      )}>
        {active ? <Tally3 className="animate-spin-slow" /> : icon}
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm font-sora">{active ? "Click Again to Confirm" : label}</p>
        <p className="text-[10px] font-medium text-zinc-500">{desc}</p>
      </div>
      {active && (
        <div className={cn("w-2 h-2 rounded-full animate-pulse", `bg-${color}-500`)} />
      )}
    </button>
  );
}

