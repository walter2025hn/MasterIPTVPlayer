import { NextResponse } from "next/server";
import { createDecipheriv } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Falta configurar la conexión segura.");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc("get_device_playlist_config", {
      p_device_id: deviceId, p_device_fingerprint_hash: fingerprint
    });
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Dispositivo no autorizado." }, { status: 403 });

    const config = decryptConfig(data.encrypted_config);
    let text = "";
    if (data.source_type === "m3u_file") {
      text = config.content ?? "";
    } else {
      let target: URL;
      if (data.source_type === "m3u_url") {
        target = new URL(config.url);
      } else if (data.source_type === "xtream") {
        target = new URL(config.server);
        target.pathname = target.pathname.replace(/\\/$/, "") + "/get.php";
        target.search = new URLSearchParams({ username: config.username, password: config.password, type: "m3u_plus", output: "ts" }).toString();
      } else {
        return NextResponse.json({ error: "Formato de lista no compatible." }, { status: 400 });
      }
      if (!["http:", "https:"].includes(target.protocol)) return NextResponse.json({ error: "URL de lista no válida." }, { status: 400 });
      const response = await fetch(target, { signal: AbortSignal.timeout(45000), headers: { "User-Agent": "MasterIPTVPlayer/1.0" } });
      if (!response.ok) return NextResponse.json({ error: "El servidor de la lista respondió " + response.status }, { status: 502 });
      text = await response.text();
    }

    if (!text.trim().startsWith("#EXTM3U")) return NextResponse.json({ error: "La lista seleccionada no devolvió un M3U válido." }, { status: 422 });
    return new Response(text, { status: 200, headers: { "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la lista." }, { status: 400 });
  }
}
