import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(request:Request){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Inicia sesión."},{status:401});
 const body=await request.json(); const subject=String(body.subject??"").trim(); const message=String(body.message??"").trim();
 if(subject.length<3||subject.length>120||message.length<5||message.length>5000)return NextResponse.json({error:"Revisa el asunto y el mensaje."},{status:400});
 const {data,error}=await supabase.from("support_tickets").insert({user_id:user.id,subject,message}).select("id").single();
 if(error)return NextResponse.json({error:error.message},{status:400});
 return NextResponse.json({success:true,id:data.id},{status:201});
}