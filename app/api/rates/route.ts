import { NextResponse } from "next/server";

export const revalidate = 3600;

const currencies = ["CLP","ARS","BRL","USD","EUR","PEN","COP","UYU","GBP","CAD","MXN","AUD"] as const;

export async function GET() {
  try {
    const response = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=CLP", {
      headers:{accept:"application/json"},
      next:{revalidate:3600},
    });
    if(!response.ok) throw new Error("rate provider unavailable");
    const payload = await response.json() as {data?:{currency?:string;rates?:Record<string,string>}};
    const source=payload.data?.rates;
    if(!source) throw new Error("invalid rate payload");
    const rates=Object.fromEntries(currencies.map((code)=>[code,code==="CLP"?1:Number(source[code])]).filter(([,value])=>Number.isFinite(value)));
    return NextResponse.json({base:"CLP",rates,checkedAt:new Date().toISOString(),provider:"Coinbase reference rates"},{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
  } catch {
    return NextResponse.json({error:"No fue posible actualizar las tasas de referencia."},{status:503});
  }
}
