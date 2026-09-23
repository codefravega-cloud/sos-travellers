export type RatesResponse={rates:Record<string,number>;checkedAt:string;provider:string};

export const currencyOptions=[
  ["CLP","🇨🇱 Peso chileno"],["ARS","🇦🇷 Peso argentino"],["BRL","🇧🇷 Real brasileño"],["USD","🇺🇸 Dólar estadounidense"],
  ["EUR","🇪🇺 Euro"],["PEN","🇵🇪 Sol peruano"],["COP","🇨🇴 Peso colombiano"],["UYU","🇺🇾 Peso uruguayo"],
  ["GBP","🇬🇧 Libra esterlina"],["CAD","🇨🇦 Dólar canadiense"],["MXN","🇲🇽 Peso mexicano"],["AUD","🇦🇺 Dólar australiano"],
] as const;

export function convertClp(amount:number,currency:string,rates:Record<string,number>|null){
  if(currency==="CLP") return amount;
  return rates?.[currency]?amount*rates[currency]:null;
}

export function formatTravelMoney(amount:number,currency:string,locale:string,rates:Record<string,number>|null){
  const converted=convertClp(amount,currency,rates);
  if(converted===null) return "—";
  return new Intl.NumberFormat(locale,{style:"currency",currency,maximumFractionDigits:["CLP","ARS","COP"].includes(currency)?0:2}).format(converted);
}
