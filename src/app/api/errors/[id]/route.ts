import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import ErrorLog from "@/models/ErrorLog";
import { SPACED_DAYS } from "@/lib/planData";
import { addDays, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const body = await req.json();
    const doc = await ErrorLog.findById(params.id);
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

    if (body.action === "review") {
      // advance spaced repetition
      const next = doc.reviewsDone + 1;
      doc.reviewsDone = next;
      if (next >= SPACED_DAYS.length) {
        doc.status = "resolved"; // graduated out of the log
        doc.nextReview = "";
      } else {
        doc.nextReview = addDays(todayStr(), SPACED_DAYS[next]);
      }
    } else if (body.action === "resolve") {
      doc.status = "resolved";
      doc.nextReview = "";
    } else if (body.action === "reopen") {
      doc.status = "open";
      doc.nextReview = addDays(todayStr(), SPACED_DAYS[Math.min(doc.reviewsDone, SPACED_DAYS.length - 1)]);
    } else {
      Object.assign(doc, body);
    }
    await doc.save();
    return NextResponse.json(doc.toObject());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    await ErrorLog.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
