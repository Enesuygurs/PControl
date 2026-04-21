import { NextResponse } from "next/server";
import { getConfig, setConfig } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = getConfig();
    const existingPin = config.pin;

    // If no PIN exists, this is a setup request
    if (!existingPin) {
      if (body.pin && body.pin.length === 4) {
        setConfig({ pin: body.pin });
        return NextResponse.json({ success: true, message: "PIN Setup Successful" });
      }
      return NextResponse.json({ error: "Invalid PIN format for setup" }, { status: 400 });
    }

    if (body.pin === existingPin) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Access Denied" }, { status: 401 });
  } catch (error) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
