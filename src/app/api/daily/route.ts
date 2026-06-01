import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import DailyLog from "@/models/DailyLog";
import { phaseForDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/daily            -> list (optionally ?from=&to=)
// GET /api/daily?date=YYYY  -> single day (or null)
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (date) {
      const log = await DailyLog.findOne({ date }).lean();
      return NextResponse.json(log || null);
    }
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q: any = {};
    if (from || to) q.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const logs = await DailyLog.find(q).sort({ date: 1 }).lean();
    return NextResponse.json(logs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST/PUT upsert a day by date
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    if (!body.date) return NextResponse.json({ error: "date required" }, { status: 400 });
    body.phase = body.phase || phaseForDate(body.date);
    const saved = await DailyLog.findOneAndUpdate({ date: body.date }, { $set: body }, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).lean();
    return NextResponse.json(saved);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
