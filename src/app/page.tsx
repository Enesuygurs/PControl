

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
