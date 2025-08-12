import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Subscriber from "@/models/Subscriber";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 }
  );
}

// export async function GET(req) {
//   await dbConnect();
//   await Subscriber.init();

//   const { searchParams } = new URL(req.url);
//   const limitParam = (searchParams.get("limit") || "").toLowerCase();
//   const unlimited = limitParam === "0" || limitParam === "all";

//   const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
//   const limit = unlimited
//     ? 0
//     : Math.min(100, Math.max(1, parseInt(limitParam || "20", 10)));
//   const skip = unlimited ? 0 : (page - 1) * limit;

//   const filter = {};

//   const [total, items] = await Promise.all([
//     Subscriber.countDocuments(filter),
//     (async () => {
//       const q = Subscriber.find(filter).sort({ createdAt: -1 });
//       if (!unlimited) q.skip(skip).limit(limit);
//       return q.lean();
//     })(),
//   ]);

//   const totalPages = unlimited ? 1 : Math.max(1, Math.ceil(total / limit));

//   return NextResponse.json({
//     ok: true,
//     total,
//     page: unlimited ? 1 : page,
//     perPage: unlimited ? total : limit,
//     totalPages,
//     hasNext: !unlimited && page < totalPages,
//     hasPrev: !unlimited && page > 1,
//     nextPage: !unlimited && page < totalPages ? page + 1 : null,
//     prevPage: !unlimited && page > 1 ? page - 1 : null,
//     data: items,
//   });
// }

export async function GET(req) {
  const adminRequired = process.env.WEBHOOK_SECRET;
  const token =
    req.headers.get("x-webhook-token") ||
    new URL(req.url).searchParams.get("token");

  if (!adminRequired || token !== adminRequired) return unauthorized();

  await dbConnect();
  await Subscriber.init();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limitParam = (searchParams.get("limit") || "20").toLowerCase();
  const unlimited = limitParam === "0" || limitParam === "all";
  const limit = unlimited
    ? 0
    : Math.min(100, Math.max(1, parseInt(limitParam, 10)));
  const skip = unlimited ? 0 : (page - 1) * limit;

  const filter = {};
  const [total, items] = await Promise.all([
    Subscriber.countDocuments(filter),
    (async () => {
      const q = Subscriber.find(filter)
        .select("name phone createdAt updatedAt")
        .sort({ createdAt: -1 });
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
