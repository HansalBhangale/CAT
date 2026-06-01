import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import DailyLog from "@/models/DailyLog";
import { phaseForDate, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/daily/focus  { date?, minutes }
// Atomically records one completed focus session on the given day.
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const date = body.date || todayStr();
    const minutes = Math.max(0, Math.round(body.minutes || 0));
    const updated = await DailyLog.findOneAndUpdate(
      { date },
      { $inc: { pomodoros: 1, focusMinutes: minutes }, $setOnInsert: { phase: phaseForDate(date) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
