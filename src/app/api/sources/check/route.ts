import { NextResponse } from "next/server";
import { createDecipheriv } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
function decrypt(value:string){const secret=process.env.IPTV_CONFIG_ENCRYPTION_KEY;if(!secret||!/^[a-f0-9]{64}$/i.test(secret))throw new Error("Falta configurar el cifrado.");const p=JSON.parse(value);const d=createDecipheriv("aes-256-gcm",Buffer.from(secret,"hex"),Buffer.from(p.iv,"base64"));d.setAuthTag(Buffer.from(p.tag,"base64"));return JSON.parse(Buffer.concat([d.update(Buffer.from(p.data,"base64")),d.final()]).toString("utf8")) as Record<string,string>;}
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Inicia sesión."},{status:401});
 const {sourceId}=await request.json();const {data:source,error}=await supabase.from("iptv_sources").select("id,user_id,source_type,encrypted_config").eq("id",String(sourceId??"")).eq("user_id",user.id).maybeSingle();
 if(error||!source)return NextResponse.json({error:"No se encontró esa lista."},{status:404});
 let status="error",httpStatus:number|null=null,message="No se pudo comprobar la lista.";
 try{const config=decrypt(source.encrypted_config);let target:string;
 if(source.source_type==="m3u_url")target=config.url;
 else if(source.source_type==="xtream"){const u=new URL(config.server);u.pathname=u.pathname.replace(/\/$/,"")+"/player_api.php";u.search=new URLSearchParams({username:config.username,password:config.password}).toString();target=u.toString();}
 else {const valid=(config.content??"").trim().startsWith("#EXTM3U");status=valid?"ok":"error";message=valid?"Archivo M3U guardado correctamente.":"El archivo no tiene cabecera M3U.";throw new Error("LOCAL_CHECK");}
 const response=await fetch(target,{method:"GET",redirect:"manual",signal:AbortSignal.timeout(12000),headers:{"User-Agent":"MasterIPTVPlayer/1.0"}});
 httpStatus=response.status;status=response.ok?"ok":"error";message=response.ok?"El servidor respondió correctamente.":"El servidor respondió HTTP "+response.status;
 }catch(e){if(e instanceof Error&&e.message==="LOCAL_CHECK"){}else message=e instanceof Error?e.message:"Error de conexión.";}
 const {data:check,error:saveError}=await supabase.from("source_checks").insert({user_id:user.id,source_id:source.id,status,http_status: httpStatus,message}).select("status,http_status,message,checked_at").single();
 if(saveError)return NextResponse.json({error:saveError.message},{status:400});
 return NextResponse.json({check});
}