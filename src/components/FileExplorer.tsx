"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Folder, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  HardDrive, 
  Upload, 
  X,
  Loader2,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  Search,
  MoreVertical,
  ArrowUp
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FileItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  birthtime: string;
}

interface FileExplorerProps {
  onClose: () => void;
}

export default function FileExplorer({ onClose }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [drives, setDrives] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     fetchFiles("");
  }, []);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFiles(data.files);
      setDrives(data.drives);
      setCurrentPath(data.currentPath);
    } catch (err: any) {
      toast.error("Failed to load files: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    fetchFiles(path);
  };

  const handleGoBack = () => {
    const parent = currentPath.split(/[\\\/]/).slice(0, -1).join("\\");
    if (parent) handleNavigate(parent);
    else if (currentPath.endsWith(":\\")) handleNavigate(""); // Go to drive selection
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
    
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(file.path)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`${file.name} deleted`);
      fetchFiles(currentPath);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRename = async (file: FileItem) => {
    const newName = prompt("Enter new name:", file.name);
    if (!newName || newName === file.name) return;

    const newPath = file.path.replace(file.name, newName);
    
    try {
      const res = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath: file.path, newPath }),
      });
      if (!res.ok) throw new Error("Rename failed");
      toast.success("Renamed successfully");
      fetchFiles(currentPath);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDownload = (file: FileItem) => {
    window.open(`/api/files/download?path=${encodeURIComponent(file.path)}`, "_blank");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath);

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success("File uploaded");
      fetchFiles(currentPath);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) return <Folder className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />;
    const ext = file.name.split(".").pop()?.toLowerCase();
    
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext!)) 
      return <FileImage className="w-5 h-5 text-emerald-400" />;
    if (["mp4", "mkv", "avi", "mov"].includes(ext!)) 
      return <FileVideo className="w-5 h-5 text-rose-400" />;
    if (["mp3", "wav", "flac"].includes(ext!)) 
      return <FileAudio className="w-5 h-5 text-amber-400" />;
    if (["js", "ts", "tsx", "py", "sh", "html", "css", "json", "ps1"].includes(ext!)) 
      return <FileCode className="w-5 h-5 text-cyan-400" />;
    
    return <FileText className="w-5 h-5 text-zinc-400" />;
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-5xl h-[85vh] bg-zinc-900/90 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
             <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
               <HardDrive className="w-6 h-6" />
             </div>
             <div className="min-w-0">
               <h2 className="text-xl font-bold font-sora">Remote Explorer</h2>
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{currentPath || "Select Base Drive"}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-2.5 transition-all">
                <Search className="w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs font-medium focus:ring-0 focus:outline-none w-48 ml-2"
                />
             </div>
             <button 
               onClick={onClose}
               className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
             >
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 bg-zinc-950/20 border-b border-white/5 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <button 
            onClick={handleGoBack}
            disabled={!currentPath}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 disabled:opacity-30 transition-all"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-[1px] bg-white/10 mx-1 shrink-0" />

          {drives.map(drive => (
            <button
              key={drive}
              onClick={() => handleNavigate(drive)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border",
                currentPath.startsWith(drive) 
                  ? "bg-indigo-500 border-indigo-500 text-white shadow-lg" 
                  : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
              )}
            >
              {drive}
            </button>
          ))}

          <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleUpload} 
             className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={!currentPath || uploading}
            className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black uppercase tracking-widest transition-all hover:bg-emerald-500/20"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            UPLOAD
          </button>
        </div>

        {/* Main Area */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center opacity-30">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-black uppercase tracking-tighter">Scanning Filesystem...</p>
             </div>
          ) : !currentPath ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {drives.map(drive => (
                 <button 
                   key={drive}
                   onClick={() => handleNavigate(drive)}
                   className="p-6 rounded-[2rem] bg-zinc-800/20 border border-white/5 hover:border-indigo-500/30 transition-all group text-left"
                 >
                    <HardDrive className="w-10 h-10 text-indigo-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-xl font-bold font-sora">Drive {drive}</h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Storage Node</p>
                 </button>
               ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
               <Folder className="w-16 h-16 mb-4" />
               <p className="font-black uppercase tracking-[0.3em]">Directory Empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
               {filteredFiles.map((file, i) => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.02 }}
                   onDoubleClick={() => file.isDirectory && handleNavigate(file.path)}
                   className="group p-5 rounded-3xl bg-zinc-800/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all relative overflow-hidden"
                 >
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors">
                        {getFileIcon(file)}
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {file.isDirectory ? (
                            <button 
                              onClick={() => handleNavigate(file.path)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500 hover:text-white transition-all"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                         ) : (
                            <button 
                              onClick={() => handleDownload(file)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500 hover:text-white transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                         )}
                         <button 
                           onClick={() => handleRename(file)}
                           className="p-2 rounded-lg bg-white/5 hover:bg-amber-500 hover:text-white transition-all"
                         >
                            <Edit3 className="w-3.5 h-3.5" />
                         </button>
                         <button 
                           onClick={() => handleDelete(file)}
                           className="p-2 rounded-lg bg-white/5 hover:bg-rose-500 hover:text-white transition-all"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                   </div>
                   
                   <div className="min-w-0">
                      <p className="text-sm font-bold font-sora truncate text-zinc-100 mb-1" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between">
                         <p className="text-[9px] font-black uppercase text-zinc-500 tracking-tighter">
                            {file.isDirectory ? "Folder" : formatSize(file.size)}
                         </p>
                         <p className="text-[9px] font-medium text-zinc-600">
                            {new Date(file.birthtime).toLocaleDateString()}
                         </p>
                      </div>
                   </div>

                   {/* Progress context for folders */}
                   {file.isDirectory && (
                      <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                         <Folder className="w-16 h-16 rotate-12" />
                      </div>
                   )}
                 </motion.div>
               ))}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="px-8 py-3 bg-zinc-950 border-t border-white/5 flex justify-between items-center">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Secure Node File Access</p>
            <p className="text-[9px] font-bold text-zinc-500">Nodes: {filteredFiles.length} detected</p>
        </div>
      </div>
    </motion.div>
  );
}
