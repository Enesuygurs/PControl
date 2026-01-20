import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Helper to format file info
async function getFileInfo(filePath: string, name: string) {
  try {
    const stats = await fs.stat(filePath);
    return {
      name: name,
      path: filePath,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      birthtime: stats.birthtime,
      mtime: stats.mtime,
    };
  } catch (e) {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dirPath = searchParams.get("path") || os.homedir();

  try {
    const files = await fs.readdir(dirPath);
    const fileInfos = await Promise.all(
      files.map(async (f) => await getFileInfo(path.join(dirPath, f), f))
    );

    return NextResponse.json({
      currentPath: path.resolve(dirPath),
      files: fileInfos.filter(f => f !== null),
      drives: os.platform() === 'win32' ? await getWindowsDrives() : []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getWindowsDrives() {
  // Simple check for A-Z drives on Windows
  const drives = [];
  for (let i = 65; i <= 90; i++) {
    const drive = String.fromCharCode(i) + ":\\";
    try {
      await fs.access(drive);
      drives.push(drive);
    } catch (e) {}
  }
  return drives;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const destDir = formData.get("path") as string || os.homedir();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(destDir, file.name);

    await fs.writeFile(filePath, buffer);
    return NextResponse.json({ success: true, path: filePath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { oldPath, newPath } = await req.json();
    await fs.rename(oldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
