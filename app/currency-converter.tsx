"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "./places";
import { currencyOptions, RatesResponse } from "./travel-money";

const words={
  es:{eyebrow:"CAMBIO PARA VIAJEROS",title:"Conversor a peso chileno",intro:"Calcula un valor referencial antes de pagar. SOS Travellers comprueba las tasas cada hora.",amount:"Monto",from:"Desde",to:"Hacia",loading:"Actualizando tasas…",updated:"Comprobado",note:"Valor referencial de mercado. Bancos, tarjetas y casas de cambio agregan margen o comisión.",error:"No pudimos actualizar las tasas. Intenta nuevamente en unos minutos.",swap:"Intercambiar monedas"},
  en:{eyebrow:"TRAVELLER EXCHANGE",title:"Chilean peso converter",intro:"Estimate a value before paying. SOS Travellers checks rates every hour.",amount:"Amount",from:"From",to:"To",loading:"Updating rates…",updated:"Checked",note:"Indicative market value. Banks, cards and exchange bureaux add spreads or fees.",error:"Rates could not be updated. Please try again shortly.",swap:"Swap currencies"},
  pt:{eyebrow:"CÂMBIO PARA VIAJANTES",title:"Conversor para peso chileno",intro:"Calcule um valor de referência antes de pagar. SOS Travellers verifica as taxas a cada hora.",amount:"Valor",from:"De",to:"Para",loading:"Atualizando taxas…",updated:"Verificado",note:"Valor de mercado indicativo. Bancos, cartões e casas de câmbio adicionam margem ou tarifa.",error:"Não foi possível atualizar as taxas. Tente novamente em alguns minutos.",swap:"Trocar moedas"},
  fr:{eyebrow:"CHANGE POUR VOYAGEURS",title:"Convertisseur en peso chilien",intro:"Estimez un montant avant de payer. SOS Travellers vérifie les taux chaque heure.",amount:"Montant",from:"Depuis",to:"Vers",loading:"Mise à jour des taux…",updated:"Vérifié",note:"Valeur indicative. Banques, cartes et bureaux de change ajoutent marge ou commission.",error:"Impossible de mettre les taux à jour. Réessayez dans quelques minutes.",swap:"Inverser les devises"},
};

export default function CurrencyConverter({locale,selectedCurrency,onCurrencyChange}:{locale:Locale;selectedCurrency:string;onCurrencyChange:(currency:string)=>void}) {
  const [amount,setAmount]=useState("100");
  const [from,setFrom]=useState("USD");
  const [data,setData]=useState<RatesResponse|null>(null);
  const [failed,setFailed]=useState(false);
  const t=words[locale];
  useEffect(()=>{fetch("/api/rates").then((response)=>{if(!response.ok)throw new Error();return response.json()}).then(setData).catch(()=>setFailed(true))},[]);
  const result=useMemo(()=>{
    const value=Number(amount.replace(",","."));
    if(!data||!Number.isFinite(value)||!data.rates[from]||!data.rates[selectedCurrency]) return null;
    return value/data.rates[from]*data.rates[selectedCurrency];
  },[amount,from,selectedCurrency,data]);
  const formatted=result===null?"—":new Intl.NumberFormat(locale,{style:"currency",currency:selectedCurrency,maximumFractionDigits:selectedCurrency==="CLP"||selectedCurrency==="ARS"||selectedCurrency==="COP"?0:2}).format(result);
  return <section className="currency" aria-labelledby="currency-title">
    <div className="currency-copy"><p>{t.eyebrow}</p><h2 id="currency-title">{t.title}</h2><span>{t.intro}</span></div>
    <div className="converter-card">
      <label>{t.amount}<input inputMode="decimal" value={amount} onChange={(event)=>setAmount(event.target.value)} aria-label={t.amount}/></label>
      <label>{t.from}<select value={from} onChange={(event)=>setFrom(event.target.value)}>{currencyOptions.map(([code,name])=><option key={code} value={code}>{name} · {code}</option>)}</select></label>
      <button className="swap" type="button" aria-label={t.swap} title={t.swap} onClick={()=>{const previous=from;setFrom(selectedCurrency);onCurrencyChange(previous)}}>⇄</button>
      <label>{t.to}<select value={selectedCurrency} onChange={(event)=>onCurrencyChange(event.target.value)}>{currencyOptions.map(([code,name])=><option key={code} value={code}>{name} · {code}</option>)}</select></label>
      <output>{formatted}</output>
      <div className="rate-meta">{failed?t.error:data?<>{t.updated} {new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"America/Santiago"}).format(new Date(data.checkedAt))} · <a href="https://www.coinbase.com/" target="_blank" rel="noreferrer">Coinbase</a></>:t.loading}</div>
      <small>{t.note}</small>
    </div>
  </section>;
}
