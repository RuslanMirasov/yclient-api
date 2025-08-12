import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Subscriber from "@/models/Subscriber";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export async function POST(req) {
  await dbConnect();
  await Subscriber.init();

  // проверка секрета: заголовок или query ?token=
  const secret = process.env.WEBHOOK_SECRET || "";
  if (secret) {
    const token =
      req.headers.get("x-webhook-token") ||
      new URL(req.url).searchParams.get("token");
    if (token !== secret) return unauthorized();
  }

  try {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    let payload = {};
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => (payload[k] = v));
    }

    const name =
      payload.name ||
      payload.fullname ||
      payload.username ||
      payload.Name ||
      payload.NAME ||
      "";
    const phone =
      payload.phone ||
      payload.tel ||
      payload.phone_number ||
      payload.Phone ||
      payload.PHONE ||
      "";

    if (!name || !phone) {
      return NextResponse.json(
        { ok: false, error: "name and phone are required" },
        { status: 400 }
      );
    }

    try {
      const doc = await Subscriber.create({
        name,
        phone,
        source: "tilda",
        meta: payload,
      });
      return NextResponse.json(
        { ok: true, created: true, id: doc._id },
        { status: 200 }
      );
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
