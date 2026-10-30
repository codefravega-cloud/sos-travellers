import { type ReactNode, useEffect, useState } from "react";
import { type RegionId, regionById, regions, zoneById } from "./chile-regions";
import type { TipTopic } from "./chile-tips";
import ConnectivityGuide from "./connectivity-guide";
import CurrencyConverter from "./currency-converter";
import EventsToday from "./events-today";
import ExclusiveGuides from "./exclusive-guides";
import { type Locale, places } from "./places";
import SafetyHub from "./safety-hub";
import SceneImage, { sceneFor } from "./scene-image";
import ServicesBoard, { fetchCategories, fetchServices, type Category, type Service } from "./services-board";
import TransportGuide from "./transport-guide";

// What a signed-in traveller sees in /panel: the landing's sections, around their name and their region. Unlike the rest
// of the panel it is in four languages, and it shares the landing's localStorage keys so both stay in step.
export type Promotion={id:number;title:string;description?:string;validUntil:string;business:{name:string;address?:string;active:boolean}};

const copy:Record<Locale,{eyebrow:string;hello:string;from:string;region:string;highlights:string;map:string;signOut:string;free:string;freeTitle:string;freeLede:string;topics:Record<TipTopic,string>;saved:string;savedEmpty:string;savedMore:string;promoEyebrow:string;promoTitle:string;promoLede:string;promoEmpty:string;until:string;serving:string}>={
  es:{eyebrow:"TU VIAJE POR CHILE",hello:"Hola",from:"Viajas desde",region:"Tu región",highlights:"Imperdibles",map:"Ver lugares en el mapa",signOut:"Salir",free:"GRATIS PARA TI",freeTitle:"Lo esencial de",freeLede:"Consejos para preparar el viaje. Las condiciones cambian: confírmalas antes de salir.",topics:{season:"Cuándo ir",transport:"Cómo moverse",pack:"Qué llevar",safety:"Seguridad",connectivity:"Internet y teléfono"},saved:"Tus lugares guardados",savedEmpty:"Guarda lugares con ♡ en el mapa y aparecerán aquí.",savedMore:"más",promoEyebrow:"BENEFICIOS DE LOCALES",promoTitle:"Promociones en",promoLede:"Muéstralas en el local para canjearlas.",promoEmpty:"Todavía no hay promociones en esta región.",until:"Hasta el",serving:"Atendiendo ahora"},
  en:{eyebrow:"YOUR TRIP IN CHILE",hello:"Hi",from:"Travelling from",region:"Your region",highlights:"Must-sees",map:"See places on the map",signOut:"Sign out",free:"FREE FOR YOU",freeTitle:"The essentials of",freeLede:"Tips to plan your trip. Conditions change: check them before you go.",topics:{season:"When to go",transport:"Getting around",pack:"What to pack",safety:"Safety",connectivity:"Internet and phone"},saved:"Your saved places",savedEmpty:"Save places with ♡ on the map and they will show up here.",savedMore:"more",promoEyebrow:"PARTNER PERKS",promoTitle:"Deals in",promoLede:"Show them at the venue to redeem them.",promoEmpty:"No deals in this region yet.",until:"Until",serving:"Open now"},
  pt:{eyebrow:"SUA VIAGEM PELO CHILE",hello:"Olá",from:"Viajando de",region:"Sua região",highlights:"Imperdíveis",map:"Ver lugares no mapa",signOut:"Sair",free:"GRÁTIS PARA VOCÊ",freeTitle:"O essencial de",freeLede:"Dicas para preparar a viagem. As condições mudam: confirme antes de sair.",topics:{season:"Quando ir",transport:"Como se locomover",pack:"O que levar",safety:"Segurança",connectivity:"Internet e telefone"},saved:"Seus lugares salvos",savedEmpty:"Salve lugares com ♡ no mapa e eles aparecerão aqui.",savedMore:"mais",promoEyebrow:"BENEFÍCIOS DE PARCEIROS",promoTitle:"Promoções em",promoLede:"Mostre no local para usar.",promoEmpty:"Ainda não há promoções nesta região.",until:"Até",serving:"Atendendo agora"},
  fr:{eyebrow:"VOTRE VOYAGE AU CHILI",hello:"Bonjour",from:"En provenance de",region:"Votre région",highlights:"Incontournables",map:"Voir les lieux sur la carte",signOut:"Se déconnecter",free:"GRATUIT POUR VOUS",freeTitle:"L’essentiel :",freeLede:"Des conseils pour préparer le voyage. Les conditions changent : vérifiez-les avant de partir.",topics:{season:"Quand partir",transport:"Se déplacer",pack:"Quoi emporter",safety:"Sécurité",connectivity:"Internet et téléphone"},saved:"Vos lieux enregistrés",savedEmpty:"Enregistrez des lieux avec ♡ sur la carte et ils apparaîtront ici.",savedMore:"de plus",promoEyebrow:"AVANTAGES PARTENAIRES",promoTitle:"Promotions :",promoLede:"Montrez-les sur place pour en profiter.",promoEmpty:"Pas encore de promotions dans cette région.",until:"Jusqu’au",serving:"Ouvert maintenant"},
};
const topics:TipTopic[]=["season","transport","pack","safety","connectivity"];
const locales:Locale[]=["es","en","pt","fr"];

const stored=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const store=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* private mode */}};
const savedIds=()=>{try{const ids:unknown=JSON.parse(stored("sos-favorites")??"[]");return Array.isArray(ids)?ids.filter((id):id is string=>typeof id==="string"):[]}catch{return []}};
const day=(iso:string,locale:Locale)=>new Intl.DateTimeFormat(locale,{timeZone:"UTC",day:"numeric",month:"long"}).format(new Date(`${iso}T12:00:00Z`));

async function fetchPromotions(region:RegionId):Promise<Promotion[]>{
  const response=await fetch(`/api/promotions?region=${region}`);
  if(!response.ok)throw new Error("promotions");
  return ((await response.json()) as {promotions?:Promotion[]}).promotions??[];
}

export default function TravellerHome({name,country,banner,footer,onSignOut,loadPromotions=fetchPromotions,loadServices=fetchServices,loadCategories=fetchCategories}:{name:string;country?:string;banner?:ReactNode;footer?:ReactNode;onSignOut:()=>void;loadPromotions?:(region:RegionId)=>Promise<Promotion[]>;loadServices?:(region:RegionId)=>Promise<Service[]>;loadCategories?:()=>Promise<Category[]>}){
  const [locale,setLocale]=useState<Locale>(()=>{const value=stored("sos-language");return locales.includes(value as Locale)?value as Locale:"es"});
  const [currency,setCurrency]=useState(()=>stored("sos-currency")??"CLP");
  const [region,setRegion]=useState<RegionId>(()=>{const value=stored("sos-region");return regions.some((item)=>item.id===value)?value as RegionId:"RM"});
  const [tips,setTips]=useState<typeof import("./chile-tips")|null>(null);
  const [promotions,setPromotions]=useState<{region:RegionId;list:Promotion[]}|null>(null);
  const [now,setNow]=useState(()=>new Date());
  const t=copy[locale],place=regionById(region),zone=zoneById(place.zone);
  const saved=savedIds(),savedPlaces=places.filter((item)=>saved.includes(item.id));

  useEffect(()=>{store("sos-language",locale);document.documentElement.lang=locale},[locale]);
  useEffect(()=>{store("sos-currency",currency)},[currency]);
  useEffect(()=>{store("sos-region",region)},[region]);
  useEffect(()=>{void import("./chile-tips").then(setTips).catch(()=>setTips(null))},[]);
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{
    let alive=true;
    loadPromotions(region).then((list)=>{if(alive)setPromotions({region,list})}).catch(()=>{if(alive)setPromotions({region,list:[]})});
    return()=>{alive=false};
  },[region,loadPromotions]);
  const shownPromotions=promotions?.region===region?promotions.list:null;

  return <>
    <header className="topbar">
      <a className="brand" href="/" aria-label="SOS Travellers"><img src="/assets/sos-logo-v2.png" alt="SOS Travellers · Just Enjoy"/></a>
      <div className="top-actions">
        <select aria-label="Idioma" value={locale} onChange={(event)=>setLocale(event.target.value as Locale)}><option value="es">ES · Español</option><option value="en">EN · English</option><option value="pt">PT · Português</option><option value="fr">FR · Français</option></select>
        <button type="button" className="th-signout" onClick={onSignOut}>{t.signOut}</button>
      </div>
    </header>
    <main id="top" className="traveller-home">
      {banner}
      <section className="th-hero">
        <SceneImage scene={sceneFor(place.zone,"")}/>
        <div className="th-hero-copy">
          <p className="th-eyebrow">{t.eyebrow}</p>
          <h1>{t.hello}, {name}</h1>
          {country&&country!=="Sin informar"&&<p className="th-from">{t.from} {country}</p>}
          <label className="th-region">{t.region}<select value={region} onChange={(event)=>setRegion(event.target.value as RegionId)}>{regions.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {tips&&<p className="th-summary">{tips.regionTips[region].summary[locale]}</p>}
          {tips&&<div className="th-highlights"><b>{t.highlights}</b>{tips.regionTips[region].highlights.map((item)=><span key={item}>{item}</span>)}</div>}
          <a className="th-map" href="/#mapa">⌖ {t.map} →</a>
        </div>
      </section>

      <div className="page-body">
        <section className="free-discovery th-free">
          <div className="free-discovery-head"><div><p>{t.free}</p><h2>{t.freeTitle} {zone.name[locale]}</h2><span>{t.freeLede}</span></div></div>
          {tips&&<div className="th-tips">{topics.map((topic)=><article key={topic}><h3>{t.topics[topic]}</h3><p>{tips.zoneTips[place.zone][topic][locale]}</p></article>)}</div>}
          <div className="th-saved"><h3>♥ {t.saved}</h3>{savedPlaces.length
            ?<p>{savedPlaces.map((item)=>item.name).join(" · ")}{saved.length>savedPlaces.length?` · +${saved.length-savedPlaces.length} ${t.savedMore}`:""}</p>
            :<p>{saved.length?`${saved.length} · `:""}{t.savedEmpty}</p>}</div>
        </section>

        <ServicesBoard locale={locale} region={region} loadServices={loadServices} loadCategories={loadCategories}/>

        <EventsToday locale={locale} region={region} now={now}/>

        <section className="guides th-promos">
          <div className="section-heading"><p>{t.promoEyebrow}</p><h2>{t.promoTitle} {place.name}</h2><span>{t.promoLede}</span></div>
          {shownPromotions&&!shownPromotions.length&&<p className="th-empty">{t.promoEmpty}</p>}
          {!!shownPromotions?.length&&<div className="th-promo-grid">{shownPromotions.map((promotion)=><article key={promotion.id}>
            <small>{promotion.business.name}{promotion.business.active?<em> · ● {t.serving}</em>:null}</small>
            <h3>{promotion.title}</h3>{promotion.description&&<p>{promotion.description}</p>}
            <span>{t.until} {day(promotion.validUntil,locale)}{promotion.business.address?` · ${promotion.business.address}`:""}</span>
          </article>)}</div>}
        </section>

        <ExclusiveGuides locale={locale} currency={currency}/>
        <CurrencyConverter locale={locale} selectedCurrency={currency} onCurrencyChange={setCurrency}/>
        {region==="RM"&&<TransportGuide locale={locale} currency={currency} onCurrencyChange={setCurrency} onShowMetro={()=>window.location.assign("/#mapa")}/>}
        <ConnectivityGuide locale={locale} profile={null}/>
        <SafetyHub locale={locale} coords={null}/>
        {footer}
      </div>
    </main>
  </>;
}
