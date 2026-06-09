import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Sectional from "@/models/Sectional";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const list = await Sectional.find({}).sort({ date: 1 }).lean();
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    if (!body.date || !body.chapter) return NextResponse.json({ error: "date and chapter required" }, { status: 400 });
    const created = await Sectional.create(body);
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
