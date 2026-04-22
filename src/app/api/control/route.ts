import { NextResponse } from "next/server";
import { 
  setVolume, 
  setBrightness, 
  setMute, 
  executePowerAction, 
  mediaControl, 
  launchApp, 
  killProcess,
  executeRemoteCommand,
  simulateMouse,
  simulateKeyboard,
  getScreenshot,
  getClipboard,
  setClipboard,
  openUrl,
  setShutdownTimer,
  showStickyNote,
  toggleSecurity,
  setAudioDevice,
  setDisplayMode
} from "@/lib/system-control";

export async function POST(req: Request) {
  try {
    const { action, value } = await req.json();

    let output = "";

    switch (action) {
      case "volume":
        await setVolume(value);
        break;
      case "brightness":
        await setBrightness(value);
        break;
      case "mute":
        await setMute(value);
        break;
      case "power":
        await executePowerAction(value);
        break;
      case "media":
        await mediaControl(value);
        break;
      case "launch":
        await launchApp(value);
        break;
      case "kill":
        await killProcess(value);
        break;
      case "cmd":
        output = await executeRemoteCommand(value);
        break;
      case "mouse":
        if (typeof value === "string") {
          await simulateMouse(0, 0, value);
        } else {
          await simulateMouse(value.dx, value.dy);
        }
        break;
      case "keyboard":
        await simulateKeyboard(value);
        break;
      case "screenshot":
        output = await getScreenshot();
        break;
      case "get-clipboard":
        output = await getClipboard();
        break;
      case "set-clipboard":
        await setClipboard(value);
        break;
      case "open-url":
        await openUrl(value);
        break;
      case "shutdown-timer":
        await setShutdownTimer(value);
        break;
      case "sticky-note":
        await showStickyNote(value);
        break;
      case "toggle-security":
        await toggleSecurity(value);
        break;
      case "set-audio-device":
        await setAudioDevice(value);
        break;
      case "set-display-mode":
        await setDisplayMode(value);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, output });
  } catch (error) {
    console.error("Control API Error:", error);
    return NextResponse.json({ error: "Failed to execute control" }, { status: 500 });
  }
}
