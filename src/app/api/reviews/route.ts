import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Review from "@/models/Review";

export const dynamic = "force-dynamic";

// GET /api/reviews?type=weekly&periodKey=...
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const periodKey = searchParams.get("periodKey");
    if (type && periodKey) {
      const r = await Review.findOne({ type, periodKey }).lean();
      return NextResponse.json(r || null);
    }
    const q: any = {};
    if (type) q.type = type;
    const list = await Review.find(q).sort({ periodKey: -1 }).lean();
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    if (!body.type || !body.periodKey)
      return NextResponse.json({ error: "type and periodKey required" }, { status: 400 });
    const saved = await Review.findOneAndUpdate(
      { type: body.type, periodKey: body.periodKey },
      { $set: body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json(saved);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
