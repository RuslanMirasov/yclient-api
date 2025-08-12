import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Subscriber from "@/models/Subscriber";

export const runtime = "nodejs";

function ok(body = {}) {
  return NextResponse.json({ ok: true, ...body }, { status: 200 });
}
function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export async function POST(req) {
  // проверка секрета в заголовке или query ?token=
  const secret = process.env.WEBHOOK_SECRET || "";
  if (secret) {
    const token =
      req.headers.get("x-webhook-token") ||
      new URL(req.url).searchParams.get("token");
    if (token !== secret) return unauthorized();
  }

  // парсим тело (JSON или form-data)
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  let payload = {};
  try {
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => (payload[k] = v));
    }
  } catch {
    payload = {};
  }

  // если это тест Tilda без данных — отвечаем 200, но ничего не создаём
  const isEmpty = !payload || Object.keys(payload).length === 0;
  if (isEmpty) return ok({ test: true });

  // вытаскиваем поля из разных возможных названий
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

  // если пришло что-то, но нет нужных полей — тоже считаем тестом
  if (!name || !phone)
    return ok({ test: true, received: Object.keys(payload) });

  await dbConnect();
  await Subscriber.init();

  // создаём (или отдаём duplicate)
  try {
    const doc = await Subscriber.create({ name, phone });
    return ok({ created: true, id: doc._id });
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await Subscriber.findOne({ phone });
      return ok({ created: false, duplicate: true, id: existing?._id });
    }
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
