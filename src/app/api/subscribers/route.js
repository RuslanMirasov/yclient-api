import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Subscriber from "@/models/Subscriber";

export async function GET() {
  await dbConnect();
  await Subscriber.init(); // гарантируем индексы в dev
  const list = await Subscriber.find().sort({ createdAt: -1 }).limit(20).lean();
  return NextResponse.json({ ok: true, count: list.length, data: list });
}

export async function POST(req) {
  try {
    await dbConnect();
    await Subscriber.init();

    const body = await req.json();
    const { name, phone, source = "manual", meta = {} } = body || {};
    if (!name || !phone) {
      return NextResponse.json(
        { ok: false, error: "name and phone are required" },
        { status: 400 }
      );
    }

    try {
      const doc = await Subscriber.create({ name, phone, source, meta });
      return NextResponse.json({ ok: true, created: true, id: doc._id });
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await Subscriber.findOne({ phone });
        return NextResponse.json(
          { ok: true, created: false, duplicate: true, id: existing?._id },
          { status: 200 }
        );
      }
      throw err;
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
