import { NextResponse } from "next/server";
import { createCipheriv, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function encryptConfig(value: unknown) {
  const secret = process.env.IPTV_CONFIG_ENCRYPTION_KEY;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error("La clave de cifrado del servidor no está configurada correctamente.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return JSON.stringify({
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).maybeSingle();
  if (profile?.account_status !== "active") return NextResponse.json({ error: "Tu cuenta está suspendida. Contacta con el administrador." }, { status: 403 });

  try {
    const body = await request.json();
    const label = String(body.label ?? "").trim().slice(0, 80);
    const sourceType = String(body.sourceType ?? "");
    if (!label) return NextResponse.json({ error: "Escribe un nombre para la lista." }, { status: 400 });

    let config: Record<string, string>;
    if (sourceType === "m3u_url") {
      const url = String(body.url ?? "").trim();
      let parsed: URL;
      try { parsed = new URL(url); } catch { return NextResponse.json({ error: "El enlace M3U no es válido." }, { status: 400 }); }
      if (!["http:", "https:"].includes(parsed.protocol)) return NextResponse.json({ error: "Solo se permiten enlaces HTTP o HTTPS." }, { status: 400 });
      config = { url };
    } else if (sourceType === "xtream") {
      const server = String(body.server ?? "").trim();
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "");
      try { const parsed = new URL(server); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); }
      catch { return NextResponse.json({ error: "La dirección del servidor debe ser una URL HTTP o HTTPS." }, { status: 400 }); }
      if (!username || !password) return NextResponse.json({ error: "Completa usuario y contraseña de Xtream." }, { status: 400 });
      config = { server, username, password };
    } else if (sourceType === "m3u_file") {
      const content = String(body.content ?? "");
      if (!content.trim().startsWith("#EXTM3U")) return NextResponse.json({ error: "El archivo no parece ser una lista M3U válida." }, { status: 400 });
      if (Buffer.byteLength(content, "utf8") > 8 * 1024 * 1024) return NextResponse.json({ error: "El archivo supera el límite de 8 MB." }, { status: 413 });
      config = { content };
    } else {
      return NextResponse.json({ error: "Tipo de lista no reconocido." }, { status: 400 });
    }

    const encrypted_config = encryptConfig(config);
    const { data, error } = await supabase.from("iptv_sources").insert({
      user_id: user.id, label, source_type: sourceType, encrypted_config,
    }).select("id,label,source_type,created_at").single();

    if (error) throw error;
    return NextResponse.json({ source: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la lista." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await request.json();
  const { error } = await supabase.from("iptv_sources").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
