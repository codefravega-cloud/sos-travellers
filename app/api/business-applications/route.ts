import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase(){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Supabase environment variables are unavailable.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    if(String(body.companyWebsite??"")) return NextResponse.json({ok:true});
    const businessName=String(body.businessName??"").trim(),contactName=String(body.contactName??"").trim(),email=String(body.email??"").trim(),phone=String(body.phone??"").trim(),category=String(body.category??"").trim(),address=String(body.address??"").trim(),description=String(body.description??"").trim(),website=String(body.website??"").trim();
    const languages=Array.isArray(body.languages)?body.languages.map(String).filter(value=>/^[A-Z]{2}$/.test(value)).slice(0,8):[];
    if(businessName.length<2||businessName.length>100||contactName.length<2||contactName.length>80||category.length<2||category.length>50||address.length<5||address.length>200||description.length<10||description.length>600) return NextResponse.json({error:"Revisa los campos obligatorios y sus extensiones."},{status:400});
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({error:"Correo inválido."},{status:400});
    if(!email&&phone.length<7) return NextResponse.json({error:"Incluye correo o teléfono de contacto."},{status:400});
    const {data,error}=await getSupabase().from("business_applications").insert({business_name:businessName,contact_name:contactName,email:email||null,phone:phone||null,category,address,languages,description,website:website||null,status:"pending"}).select("id").single();
    if(error) throw error;
    return NextResponse.json({ok:true,id:data.id},{status:201});
  }catch(error){console.error("Unable to save business application",error);return NextResponse.json({error:"No pudimos enviar la solicitud. Intenta nuevamente."},{status:503});}
}
