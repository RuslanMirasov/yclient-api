import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Subscriber from "@/models/Subscriber";

export async function GET(req) {
  await dbConnect();
  await Subscriber.init();

  const { searchParams } = new URL(req.url);
  const limitParam = (searchParams.get("limit") || "").toLowerCase();
  const unlimited = limitParam === "0" || limitParam === "all";

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = unlimited
    ? 0
    : Math.min(100, Math.max(1, parseInt(limitParam || "20", 10)));
  const skip = unlimited ? 0 : (page - 1) * limit;

  const filter = {};

  const [total, items] = await Promise.all([
    Subscriber.countDocuments(filter),
    (async () => {
      const q = Subscriber.find(filter).sort({ createdAt: -1 });
      if (!unlimited) q.skip(skip).limit(limit);
      return q.lean();
    })(),
  ]);

  const totalPages = unlimited ? 1 : Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    ok: true,
    total,
    page: unlimited ? 1 : page,
    perPage: unlimited ? total : limit,
    totalPages,
    hasNext: !unlimited && page < totalPages,
    hasPrev: !unlimited && page > 1,
    nextPage: !unlimited && page < totalPages ? page + 1 : null,
    prevPage: !unlimited && page > 1 ? page - 1 : null,
    data: items,
  });
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
