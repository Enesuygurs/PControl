import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export async function GET() {
  try {
    const config = getConfig();
    const isConfigured = !!config.pin;
    return NextResponse.json({ configured: isConfigured });
  } catch (error) {
    return NextResponse.json({ configured: false, error: "Failed to check config" });
  }
}
