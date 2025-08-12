import { dbConnect } from "@/lib/db";

export async function GET() {
  try {
    await dbConnect();
    return new Response(JSON.stringify({ ok: true, db: "connected" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
    });
  }
}
