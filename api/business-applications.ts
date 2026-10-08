import { getSupabase } from "./_supabase.js";

const interests=new Set(["listing","partner","event","guides"]);

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    if(String(body.companyWebsite??"")) return Response.json({ok:true});
    const businessName=String(body.businessName??"").trim(),contactName=String(body.contactName??"").trim(),email=String(body.email??"").trim(),phone=String(body.phone??"").trim(),category=String(body.category??"").trim(),address=String(body.address??"").trim(),description=String(body.description??"").trim(),website=String(body.website??"").trim();
    const languages=Array.isArray(body.languages)?body.languages.map(String).filter(value=>/^[A-Z]{2}$/.test(value)).slice(0,8):[];
    if(businessName.length<2||businessName.length>100||contactName.length<2||contactName.length>80||category.length<2||category.length>50||address.length<5||address.length>200||description.length<10||description.length>600) return Response.json({error:"Revisa los campos obligatorios y sus extensiones."},{status:400});
    const interest=String(body.interest??"listing").trim();
    if(!interests.has(interest)) return Response.json({error:"Selecciona una opción de interés válida."},{status:400});
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({error:"Correo inválido."},{status:400});
    if(!email&&phone.length<7) return Response.json({error:"Incluye correo o teléfono de contacto."},{status:400});
    const {data,error}=await getSupabase().from("business_applications").insert({business_name:businessName,contact_name:contactName,email:email||null,phone:phone||null,category,address,languages,description,website:website||null,interest,status:"pending"}).select("id").single();
    if(error) throw error;
    return Response.json({ok:true,id:data.id},{status:201});
  }catch(error){console.error("Unable to save business application",error);return Response.json({error:"No pudimos enviar la solicitud. Intenta nuevamente."},{status:503});}
}
