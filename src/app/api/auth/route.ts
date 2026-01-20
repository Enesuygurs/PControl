import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const correctPin = process.env.APP_PIN;

    if (!correctPin) {
      return NextResponse.json({ error: "Server Configuration Error: APP_PIN is missing from .env file" }, { status: 500 });
    }

    if (body.pin === correctPin) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Access Denied" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
