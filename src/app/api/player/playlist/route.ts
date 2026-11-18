import { NextResponse } from "next/server";
import { createDecipheriv } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function decryptConfig(value: string): Record<string, string> {
  const secret = process.env.IPTV_CONFIG_ENCRYPTION_KEY;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error("La clave de cifrado no está configurada.");
  const packed = JSON.parse(value);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(secret, "hex"), Buffer.from(packed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(packed.tag, "base64"));
  const clear = Buffer.concat([decipher.update(Buffer.from(packed.data, "base64")), decipher.final()]);
  return JSON.parse(clear.toString("utf8"));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deviceId = String(body.deviceId ?? "");
    const fingerprint = String(body.fingerprint ?? "");
    if (!deviceId || !/^[a-f0-9]{64}$/i.test(fingerprint)) return NextResponse.json({ error: "Dispositivo no válido." }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!serviceKey) throw new Error("Falta configurar el acceso seguro del reproductor.");
    const supabase = createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: device, error } = await supabase.from("devices")
      .select("id,user_id,source_id,status,device_fingerprint_hash")
      .eq("id", deviceId).eq("device_fingerprint_hash", fingerprint).eq("status", "active").maybeSingle();
    if (error || !device || !device.source_id) return NextResponse.json({ error: "El dispositivo no está activado." }, { status: 403 });

    const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", device.user_id).maybeSingle();
    if (profile?.account_status !== "active") return NextResponse.json({ error: "La cuenta está suspendida." }, { status: 403 });

    const { data: source } = await supabase.from("iptv_sources")
      .select("source_type,encrypted_config").eq("id", device.source_id).eq("user_id", device.user_id).maybeSingle();
    if (!source) return NextResponse.json({ error: "La lista asignada ya no existe." }, { status: 404 });

    const config = decryptConfig(source.encrypted_config);
    let text = "";
    if (source.source_type === "m3u_file") {
      text = config.content ?? "";
    } else {
      let url: URL;
      if (source.source_type === "m3u_url") {
        url = new URL(config.url);
      } else if (source.source_type === "xtream") {
        url = new URL(config.server);
        url.pathname = url.pathname.replace(/\/$/, "") + "/get.php";
        url.search = new URLSearchParams({ username: config.username, password: config.password, type: "m3u_plus", output: "ts" }).toString();
      } else {
        return NextResponse.json({ error: "Formato de lista no compatible." }, { status: 400 });
      }
      if (!["http:", "https:"].includes(url.protocol)) return NextResponse.json({ error: "URL de lista no válida." }, { status: 400 });
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { "User-Agent": "MasterIPTVPlayer/1.0" } });
      if (!response.ok) return NextResponse.json({ error: "El servidor de la lista respondió " + response.status }, { status: 502 });
      text = await response.text();
    }

    if (!text.trim().startsWith("#EXTM3U")) return NextResponse.json({ error: "La lista seleccionada no devolvió un M3U válido." }, { status: 422 });
    await supabase.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
    return new Response(text, { status: 200, headers: { "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la lista." }, { status: 400 });
  }
}
