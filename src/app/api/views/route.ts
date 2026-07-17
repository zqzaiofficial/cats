import { NextResponse } from "next/server";
import { getClientIp, getViewCount, recordView } from "@/lib/views";

export async function GET() {
  try {
    const views = await getViewCount();
    return NextResponse.json({ views });
  } catch {
    return NextResponse.json({ views: 0 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const result = await recordView(ip);
    return NextResponse.json(result);
  } catch {
    const views = await getViewCount().catch(() => 0);
    return NextResponse.json({ views, counted: false }, { status: 500 });
  }
}
