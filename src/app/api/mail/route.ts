import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/ip";
import { getMailCooldownRemainingMs, sendMail } from "@/lib/mail";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const cooldownRemainingMs = await getMailCooldownRemainingMs(ip);

    return NextResponse.json({
      cooldownRemainingMs,
      canSend: cooldownRemainingMs === 0,
    });
  } catch {
    return NextResponse.json(
      { cooldownRemainingMs: 0, canSend: true },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const author = String(body.author ?? "").trim().slice(0, 100);
    const content = String(body.content ?? "").trim().slice(0, 100);

    if (!author || !content) {
      return NextResponse.json(
        { error: "author and content are required" },
        { status: 400 }
      );
    }

    const result = await sendMail(ip, author, content);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          cooldownRemainingMs: result.cooldownRemainingMs,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "failed to send mail" },
      { status: 500 }
    );
  }
}
