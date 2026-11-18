import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const body = await request.json();
  const platform = ["android_tv", "tv_box", "android_phone", "other"].includes(body.platform) ? body.platform : "android_tv";
  const deviceName = String(body.deviceName ?? "Mi dispositivo").trim().slice(0, 80) || "Mi dispositivo";
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase.from("device_pairing_codes").insert({
    user_id: user.id, code_hash: codeHash, device_name: deviceName, platform, expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ code, expiresAt }, { status: 201 });
}
