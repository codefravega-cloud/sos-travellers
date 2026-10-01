import { getSupabase } from "./_supabase.js";

const languages=new Set(["es","en","pt","fr"]),currencies=new Set(["CLP","ARS","BRL","USD","EUR","PEN","COP","UYU","GBP","CAD","MXN","AUD"]);
const connectivityChoices=new Set(["roaming","esim","local_sim","wifi","need_help"]),budgets=new Set(["free","low","medium","flexible"]),paces=new Set(["relaxed","balanced","intense"]),times=new Set(["morning","afternoon","evening","any"]),transports=new Set(["walk","public","car","mixed"]);
const interestsAllowed=new Set(["culture","food","nature","free","views","nightlife","shopping","wine","snow","family"]);
const clean=(value:unknown,max:number)=>String(value??"").trim().slice(0,max);

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    if(clean(body.companyWebsite,100))return Response.json({ok:true});
    const adults=Number(body.adults),children=Number(body.children),tripDays=Number(body.tripDays),connectivity=clean(body.connectivity,20),budget=clean(body.budget,12),pace=clean(body.pace,12),preferredTime=clean(body.preferredTime,12),transport=clean(body.transport,12),preferredLanguage=clean(body.preferredLanguage,2),preferredCurrency=clean(body.preferredCurrency,3);
    const interests=Array.isArray(body.interests)?body.interests.map(value=>clean(value,20)).filter(value=>interestsAllowed.has(value)):[];
    const valid=body.anonymousConsent===true&&Number.isInteger(adults)&&adults>=1&&adults<=20&&Number.isInteger(children)&&children>=0&&children<=12&&Number.isInteger(tripDays)&&tripDays>=1&&tripDays<=90&&interests.length>=1&&interests.length<=10&&connectivityChoices.has(connectivity)&&budgets.has(budget)&&paces.has(pace)&&times.has(preferredTime)&&transports.has(transport)&&languages.has(preferredLanguage)&&currencies.has(preferredCurrency);
    if(!valid)return Response.json({error:"Invalid anonymous preferences"},{status:400});
    const {data,error}=await getSupabase().from("traveller_preferences").insert({adults,children,trip_days:tripDays,interests,budget,pace,preferred_time:preferredTime,transport,connectivity,preferred_language:preferredLanguage,preferred_currency:preferredCurrency,consent_at:new Date().toISOString()}).select("id").single();
    if(error)throw error;
    return Response.json({ok:true,id:data.id},{status:201});
  }catch(error){console.error("Unable to save anonymous traveller preferences",error instanceof Error?error.message:"unknown");return Response.json({error:"Unable to save preferences"},{status:503})}
}
