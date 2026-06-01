import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import ErrorLog from "@/models/ErrorLog";
import { SPACED_DAYS } from "@/lib/planData";
import { addDays, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const due = searchParams.get("due"); // "1" -> nextReview <= today and open
    const q: any = {};
    if (status) q.status = status;
    if (due === "1") {
      q.status = "open";
      q.nextReview = { $lte: todayStr() };
    }
    const errors = await ErrorLog.find(q).sort({ createdAt: -1 }).lean();
    return NextResponse.json(errors);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    if (!body.date) body.date = todayStr();
    // schedule first spaced-repetition review
    body.reviewsDone = 0;
    body.nextReview = addDays(body.date, SPACED_DAYS[0]);
    body.status = "open";
    const created = await ErrorLog.create(body);
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
