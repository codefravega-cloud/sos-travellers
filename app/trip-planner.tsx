"use client";

import { useEffect, useState } from "react";
import { Locale, Place, places } from "./places";
import { currencyOptions, formatTravelMoney, RatesResponse } from "./travel-money";

type Props={locale:Locale;favoriteIds:string[];onSelectPlace:(place:Place)=>void;onToggleFavorite:(id:string)=>void;currency:string;onCurrencyChange:(currency:string)=>void};
const routeIds={classic:["precolombino","cclm","santa-lucia","mnba","sky-300"],culture:["memoria","quinta-normal-park","precolombino","chascona","san-cristobal"],family:["planetario","museo-aeronautico","bicentenario-infancia","araucanopark"],flavours:["emporio-zunino","domino-agustinas","chipe","peumayen","singular-rooftop"],free:["quinta-normal-park","mnba","santa-lucia","esculturas-park","san-cristobal"],escape:["cousino-macul","concha-toro","centro-farellones","valle-nevado"]} as const;
const budgets={classic:[30000,55000],culture:[25000,50000],family:[15000,40000],flavours:[55000,110000],free:[5000,15000],escape:[45000,190000]} as const;
const copy={
  es:{eyebrow:"PLANIFICA SIN ENREDOS",title:"Rutas listas para disfrutar",lede:"Elige una idea, compara el presupuesto en tu moneda y abre cada parada. Son rangos por adulto: incluyen entradas, traslados locales y consumos indicados; no alojamiento.",classic:"Santiago esencial · 1 día",culture:"Cultura y cerros · 2 días",family:"Con niños",flavours:"Sabores de Santiago",free:"Plan gratis o económico",escape:"Vino o cordillera",stops:"paradas",open:"Ver parada",mine:"Mi viaje guardado",empty:"Toca el corazón de una ficha para armar tu viaje.",share:"Compartir mi viaje",copied:"Enlace copiado",remove:"Quitar",budget:"Presupuesto aprox. por persona",currency:"Ver precios en",estimate:"Estimación, no precio final"},
  en:{eyebrow:"PLAN WITHOUT THE FUSS",title:"Ready-made routes",lede:"Choose an idea, compare the budget in your currency and open each stop. Adult ranges include admission, local travel and listed purchases; lodging is excluded.",classic:"Essential Santiago · 1 day",culture:"Culture & hills · 2 days",family:"With children",flavours:"Flavours of Santiago",free:"Free or low-cost plan",escape:"Wine or mountains",stops:"stops",open:"View stop",mine:"My saved trip",empty:"Tap the heart on a place to build your trip.",share:"Share my trip",copied:"Link copied",remove:"Remove",budget:"Approx. budget per person",currency:"Show prices in",estimate:"Estimate, not a final price"},
  pt:{eyebrow:"PLANEJE SEM COMPLICAÇÃO",title:"Roteiros prontos",lede:"Escolha uma ideia, compare o orçamento em sua moeda e abra cada parada. Faixas por adulto incluem entradas, transporte local e consumos; sem hospedagem.",classic:"Santiago essencial · 1 dia",culture:"Cultura e morros · 2 dias",family:"Com crianças",flavours:"Sabores de Santiago",free:"Plano grátis ou econômico",escape:"Vinho ou cordilheira",stops:"paradas",open:"Ver parada",mine:"Minha viagem salva",empty:"Toque no coração de um lugar para montar sua viagem.",share:"Compartilhar viagem",copied:"Link copiado",remove:"Remover",budget:"Orçamento aprox. por pessoa",currency:"Ver preços em",estimate:"Estimativa, não preço final"},
  fr:{eyebrow:"PLANIFIEZ SANS STRESS",title:"Itinéraires prêts",lede:"Choisissez une idée, comparez le budget dans votre devise et ouvrez chaque étape. Fourchettes adulte avec entrées, transport local et consommations ; hébergement exclu.",classic:"Santiago essentiel · 1 jour",culture:"Culture et collines · 2 jours",family:"Avec des enfants",flavours:"Saveurs de Santiago",free:"Plan gratuit ou économique",escape:"Vin ou montagne",stops:"étapes",open:"Voir l’étape",mine:"Mon voyage enregistré",empty:"Touchez le cœur d’un lieu pour construire votre voyage.",share:"Partager mon voyage",copied:"Lien copié",remove:"Retirer",budget:"Budget approx. par personne",currency:"Afficher en",estimate:"Estimation, pas prix final"}
};

export default function TripPlanner({locale,favoriteIds,onSelectPlace,onToggleFavorite,currency,onCurrencyChange}:Props){
  const t=copy[locale];
  const [rates,setRates]=useState<RatesResponse|null>(null);
  useEffect(()=>{fetch("/api/rates").then(response=>response.ok?response.json():Promise.reject()).then(setRates).catch(()=>setRates(null))},[]);
  const saved=places.filter(place=>favoriteIds.includes(place.id));
  async function share(){
    const text=`SOS Travellers · ${t.mine}\n${saved.map((place,index)=>`${index+1}. ${place.name}`).join("\n")}\n${location.origin}`;
    if(navigator.share) await navigator.share({title:"SOS Travellers",text});
    else { await navigator.clipboard.writeText(text); window.alert(t.copied); }
  }
  return <section className="planner" id="planificar">
    <div className="planner-heading"><div className="section-heading"><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.lede}</span></div><label className="route-currency">{t.currency}<select value={currency} onChange={event=>onCurrencyChange(event.target.value)}>{currencyOptions.map(([code,name])=><option value={code} key={code}>{name} · {code}</option>)}</select><small>↔ {t.estimate}</small></label></div>
    <div className="route-grid">{Object.entries(routeIds).map(([key,ids])=>{const budget=budgets[key as keyof typeof budgets];return <article className="route-card" key={key}><div><span>{ids.length} {t.stops}</span><h3>{t[key as keyof typeof routeIds]}</h3><p>{t.budget}<strong>{formatTravelMoney(budget[0],currency,locale,rates?.rates??null)} – {formatTravelMoney(budget[1],currency,locale,rates?.rates??null)}</strong></p></div><ol>{ids.map(id=>{const place=places.find(item=>item.id===id)!;return <li key={id}><button type="button" onClick={()=>onSelectPlace(place)}><span>{place.name}</span><small>{place.neighborhood} · {place.visit}</small></button></li>})}</ol></article>})}</div>
    <div className="saved-trip"><div><p>{t.mine}</p><h3>{saved.length?`${saved.length} ${t.stops}`:t.empty}</h3></div>{saved.length>0&&<><div className="saved-chips">{saved.map(place=><button type="button" key={place.id} onClick={()=>onToggleFavorite(place.id)} title={t.remove}>{place.name} ×</button>)}</div><button className="share-trip" type="button" onClick={share}>{t.share} ↗</button></>}</div>
  </section>;
}
