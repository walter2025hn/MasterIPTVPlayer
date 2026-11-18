import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión en el panel de cliente." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).maybeSingle();
  if (profile?.account_status !== "active") return NextResponse.json({ error: "Tu cuenta está suspendida." }, { status: 403 });

  try {
    const body = await request.json();
    const code = String(body.code ?? "").replace(/\D/g, "");
    const sourceId = String(body.sourceId ?? "");
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Introduce el código de 6 dígitos que aparece en tu TV." }, { status: 400 });
    if (!sourceId) return NextResponse.json({ error: "Selecciona la lista que quieres activar." }, { status: 400 });

    const { data: source, error: sourceError } = await supabase.from("iptv_sources")
      .select("id").eq("id", sourceId).eq("user_id", user.id).maybeSingle();
    if (sourceError || !source) return NextResponse.json({ error: "La lista seleccionada no pertenece a tu cuenta." }, { status: 404 });

    const codeHash = createHash("sha256").update(code).digest("hex");
    const { data: existing } = await supabase.from("device_pairing_codes")
      .select("id,consumed_at,expires_at").eq("code_hash", codeHash).maybeSingle();
    if (existing) return NextResponse.json({ error: "Ese código ya fue utilizado. Genera uno nuevo en la TV." }, { status: 409 });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabase.from("device_pairing_codes").insert({
      user_id: user.id, code_hash: codeHash, source_id: sourceId,
      device_name: String(body.deviceName ?? "Master IPTV Player").slice(0, 80),
      platform: ["android_tv", "tv_box", "android_phone", "other"].includes(body.platform) ? body.platform : "android_tv",
      expires_at: expiresAt
    });
    if (error) throw error;
    return NextResponse.json({ success: true, message: "Solicitud aceptada. La TV se activará en unos segundos." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo vincular el dispositivo." }, { status: 400 });
  }
}
