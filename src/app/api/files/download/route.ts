import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "No path provided" }, { status: 400 });
  }

  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
       return NextResponse.json({ error: "Target is not a file" }, { status: 400 });
    }

    const fileName = path.basename(filePath);
    const stream = fs.createReadStream(filePath);

    // Convert node stream to web stream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      }
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": stats.size.toString(),
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
