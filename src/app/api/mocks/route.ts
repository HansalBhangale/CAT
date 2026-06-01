import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Mock from "@/models/Mock";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const mocks = await Mock.find({}).sort({ date: 1 }).lean();
    return NextResponse.json(mocks);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    if (!body.date || !body.name) return NextResponse.json({ error: "date and name required" }, { status: 400 });
    const created = await Mock.create(body);
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
