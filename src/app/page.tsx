

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
