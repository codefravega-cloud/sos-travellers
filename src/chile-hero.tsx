import { ReactNode, useEffect, useId, useMemo, useState } from "react";
import ChileMap from "./chile-map";
import { Destination, destinations, normalize, RegionId, regionById, regions, ZoneId, zoneById, zones } from "./chile-regions";
import type { TipTopic } from "./chile-tips";
import type { Locale } from "./places";
import localities from "./data/chile-localities.json";

type Tips = typeof import("./chile-tips");
type Result = { key:string; label:string; kind:"zone"|"region"|"destination"; haystack:string; zone:ZoneId; region:RegionId|null; locality?:string; island?:string };
type Props = {
  locale:Locale;
  region:RegionId|null;
  // `island` is set for the islands zone: a destination id, or "all" for the whole zone.
  onRegionChange:(region:RegionId|null,locality?:string,island?:string)=>void;
  onExplore:(region:RegionId)=>void;
  actions:ReactNode;
  locateBox:ReactNode;
  weather:(zone:ZoneId|null)=>ReactNode;
};

const topics:TipTopic[] = ["season","transport","pack","safety","connectivity"];
const copy:Record<Locale,{eyebrow:string;title:string;lede:string;search:string;all:string;hint:string;highlights:string;regions:string;cta:string;note:string;empty:string;loading:string;kinds:Record<Result["kind"],string>;topics:Record<TipTopic,string>}> = {
  es:{eyebrow:"CHILE, BIEN ELEGIDO",title:"¿A qué parte de Chile vas?",lede:"Elige una zona en el mapa o busca tu destino: tips de viaje y locales con buena nota para turistas, de Arica a Magallanes.",search:"Busca una región, ciudad o pueblo…",all:"Todo Chile",hint:"Toca una región del mapa",highlights:"Imperdibles",regions:"Regiones",cta:"Ver locales en el mapa",note:"Información orientativa: verifica condiciones y requisitos antes de viajar.",empty:"Aún no tenemos ese destino. Prueba con una región.",loading:"Cargando tips…",kinds:{zone:"Zona",region:"Región",destination:"Destino"},topics:{season:"Cuándo ir",transport:"Cómo moverse",pack:"Qué llevar",safety:"Cuidados",connectivity:"Internet"}},
  en:{eyebrow:"CHILE, WELL CHOSEN",title:"Where in Chile are you going?",lede:"Pick a zone on the map or search your destination: travel tips and well-rated places for visitors, from Arica to Magallanes.",search:"Search a region, city or town…",all:"All of Chile",hint:"Tap a region on the map",highlights:"Don't miss",regions:"Regions",cta:"See places on the map",note:"General guidance: check conditions and requirements before you travel.",empty:"We don't have that destination yet. Try a region.",loading:"Loading tips…",kinds:{zone:"Zone",region:"Region",destination:"Destination"},topics:{season:"When to go",transport:"Getting around",pack:"What to pack",safety:"Take care",connectivity:"Internet"}},
  pt:{eyebrow:"CHILE, BEM ESCOLHIDO",title:"Para qual parte do Chile você vai?",lede:"Escolha uma zona no mapa ou busque seu destino: dicas de viagem e lugares bem avaliados para turistas, de Arica a Magallanes.",search:"Busque uma região, cidade ou povoado…",all:"Todo o Chile",hint:"Toque em uma região do mapa",highlights:"Imperdíveis",regions:"Regiões",cta:"Ver lugares no mapa",note:"Informação orientativa: verifique condições e requisitos antes de viajar.",empty:"Ainda não temos esse destino. Tente uma região.",loading:"Carregando dicas…",kinds:{zone:"Zona",region:"Região",destination:"Destino"},topics:{season:"Quando ir",transport:"Como se locomover",pack:"O que levar",safety:"Cuidados",connectivity:"Internet"}},
  fr:{eyebrow:"LE CHILI, BIEN CHOISI",title:"Où allez-vous au Chili ?",lede:"Choisissez une zone sur la carte ou cherchez votre destination : conseils de voyage et lieux bien notés pour les visiteurs, d'Arica à Magallanes.",search:"Cherchez une région, une ville ou un village…",all:"Tout le Chili",hint:"Touchez une région sur la carte",highlights:"À ne pas manquer",regions:"Régions",cta:"Voir les lieux sur la carte",note:"Informations indicatives : vérifiez les conditions et les formalités avant de partir.",empty:"Nous n'avons pas encore cette destination. Essayez une région.",loading:"Chargement des conseils…",kinds:{zone:"Zone",region:"Région",destination:"Destination"},topics:{season:"Quand partir",transport:"Se déplacer",pack:"Quoi emporter",safety:"Précautions",connectivity:"Internet"}},
};

// Destinations that are also a comuna or town have their own places; parks and islands do not.
function localityOf(destination:Destination) {
  const {comunas,towns}=localities[destination.region];
  return !destination.island&&(comunas.includes(destination.name)||towns.includes(destination.name))?destination.name:undefined;
}

// Comunas that are islands: they open the islands zone instead of mainland Valparaíso.
const islandLocalities:Record<string,string>={"Isla de Pascua":"hanga-roa","Hanga Roa":"hanga-roa"};

function useMediaQuery(query:string) {
  const [matches,setMatches]=useState(()=>window.matchMedia(query).matches);
  useEffect(()=>{
    const media=window.matchMedia(query),update=()=>setMatches(media.matches);
    media.addEventListener("change",update);
    return()=>media.removeEventListener("change",update);
  },[query]);
  return matches;
}

export default function ChileHero({locale,region,onRegionChange,onExplore,actions,locateBox,weather}:Props) {
  const t=copy[locale],listId=useId();
  const horizontal=useMediaQuery("(max-width:900px)");
  const [islands,setIslands]=useState(false);
  const [zoneOnly,setZoneOnly]=useState<ZoneId|null>(null);
  const [hovered,setHovered]=useState<string|null>(null);
  const [topic,setTopic]=useState<TipTopic>("season");
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState(false);
  const [cursor,setCursor]=useState(0);
  const [tips,setTips]=useState<Tips|null>(null);
  const zone:ZoneId|null=islands?"islas":region?regionById(region).zone:zoneOnly;

  useEffect(()=>{ if(zone&&!tips) import("./chile-tips").then(setTips).catch(()=>{}); },[zone,tips]);

  const index=useMemo<Result[]>(()=>[
    ...zones.map((item)=>({key:`z-${item.id}`,label:item.name[locale],kind:"zone" as const,haystack:normalize(Object.values(item.name).join(" ")),zone:item.id,region:null})),
    ...regions.map((item)=>({key:`r-${item.id}`,label:item.name,kind:"region" as const,haystack:normalize(`${item.name} ${item.capital}`),zone:item.zone,region:item.id})),
    ...destinations.map((item)=>({key:`d-${item.id}`,label:item.name,kind:"destination" as const,haystack:normalize(`${item.name} ${(item.aliases??[]).join(" ")}`),zone:item.island?"islas" as const:regionById(item.region).zone,region:item.island?null:item.region,locality:localityOf(item),island:item.island?item.id:undefined})),
    // Every comuna and tourist town, so any place name resolves to its region.
    ...regions.flatMap((item)=>[...localities[item.id].comunas,...localities[item.id].towns]
      .filter((name)=>!destinations.some((destination)=>destination.name===name)&&name!==item.name)
      .map((name)=>islandLocalities[name]
        ?{key:`l-${item.id}-${name}`,label:name,kind:"destination" as const,haystack:normalize(name),zone:"islas" as const,region:null,island:islandLocalities[name]}
        :{key:`l-${item.id}-${name}`,label:name,kind:"destination" as const,haystack:normalize(name),zone:item.zone,region:item.id,locality:name})),
  ],[locale]);
  const needle=normalize(query);
  const results=needle?index.filter((item)=>item.haystack.includes(needle)).sort((a,b)=>Number(b.haystack.startsWith(needle))-Number(a.haystack.startsWith(needle))).slice(0,7):[];

  function select(nextZone:ZoneId|null,nextRegion:RegionId|null,locality?:string,island?:string) {
    setIslands(nextZone==="islas");
    setZoneOnly(nextZone==="islas"?null:nextZone);
    onRegionChange(nextRegion,locality,nextZone==="islas"?island??"all":undefined);
  }
  function choose(result:Result) { select(result.zone,result.region,result.locality,result.island); setQuery(result.label); setOpen(false); }
  const pickDestination=(destination:Destination)=>destination.island?select("islas",null,undefined,destination.id):select(regionById(destination.region).zone,destination.region,localityOf(destination));

  const zoneInfo=zone?zoneById(zone):null;
  const heading=region?regionById(region).name:zoneInfo?.name[locale];
  const summary=tips&&(region?tips.regionTips[region].summary[locale]:zone==="islas"?tips.islandSummary[locale]:null);
  const highlights=tips&&(region?tips.regionTips[region].highlights:zone==="islas"?tips.islandHighlights:null);

  return (
    <section className="chile-hero">
      <div className="chile-hero-intro">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="lede">{t.lede}</p>

        <div className="chile-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" role="combobox" aria-expanded={open&&!!needle} aria-controls={listId} aria-autocomplete="list" aria-label={t.search} placeholder={t.search} value={query}
            aria-activedescendant={open&&results[cursor]?`${listId}-${cursor}`:undefined}
            onChange={(event)=>{setQuery(event.target.value);setOpen(true);setCursor(0)}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),120)}
            onKeyDown={(event)=>{
              if(event.key==="ArrowDown"){event.preventDefault();setOpen(true);setCursor((value)=>Math.min(value+1,results.length-1))}
              else if(event.key==="ArrowUp"){event.preventDefault();setCursor((value)=>Math.max(value-1,0))}
              else if(event.key==="Enter"&&results[cursor]){event.preventDefault();choose(results[cursor])}
              else if(event.key==="Escape") setOpen(false);
            }}/>
          {open&&needle&&<ul id={listId} role="listbox">
            {results.map((result,position)=><li key={result.key} id={`${listId}-${position}`} role="option" aria-selected={position===cursor} className={position===cursor?"on":""}
              onMouseDown={(event)=>{event.preventDefault();choose(result)}} onMouseEnter={()=>setCursor(position)}><b>{result.label}</b><small>{t.kinds[result.kind]}</small></li>)}
            {!results.length&&<li className="none" role="option" aria-selected={false} aria-disabled="true">{t.empty}</li>}
          </ul>}
        </div>

        <div className="chile-zones" role="group" aria-label={t.all}>
          <button type="button" className={!zone?"on":""} aria-pressed={!zone} onClick={()=>{select(null,null);setQuery("")}}>{t.all}</button>
          {zones.map((item)=><button key={item.id} type="button" className={zone===item.id?"on":""} aria-pressed={zone===item.id} onClick={()=>select(item.id,null)}>{item.name[locale]}</button>)}
        </div>

      </div>

      <div className="chile-hero-details">
        {zoneInfo?<div className="chile-panel" aria-live="polite">
          <div className="chile-panel-head"><small>{region?zoneInfo.name[locale]:t.kinds.zone}</small><h2>{heading}</h2></div>
          {zone!=="islas"&&<div className="chile-panel-regions" role="group" aria-label={t.regions}>
            {zoneInfo.regions.map((id)=><button key={id} type="button" className={region===id?"on":""} aria-pressed={region===id} onClick={()=>select(zone,id)}>{regionById(id).name}</button>)}
          </div>}
          {summary&&<p className="chile-panel-summary">{summary}</p>}
          {highlights&&<p className="chile-panel-highlights"><b>{t.highlights}</b>{highlights.map((item)=><span key={item}>{item}</span>)}</p>}
          <div className="chile-topics" role="tablist">
            {topics.map((item)=><button key={item} type="button" role="tab" aria-selected={topic===item} className={topic===item?"on":""} onClick={()=>setTopic(item)}>{t.topics[item]}</button>)}
          </div>
          <p className="chile-tip" role="tabpanel">{tips&&zone?tips.zoneTips[zone][topic][locale]:t.loading}</p>
          <div className="chile-panel-foot">{region?<button type="button" className="chile-cta" onClick={()=>onExplore(region)}>{t.cta} ↓</button>:zone==="islas"&&<button type="button" className="chile-cta" onClick={()=>document.getElementById("mapa")?.scrollIntoView({behavior:"smooth",block:"start"})}>{t.cta} ↓</button>}<small>{t.note}</small></div>
        </div>:<div className="landing-actions">{actions}</div>}

        <div className="chile-hero-tools">{locateBox}{weather(zone)}</div>
      </div>

      <div className={`chile-hero-map ${horizontal?"horizontal":""}`}>
        <ChileMap zone={zone} region={region} horizontal={horizontal} islandsLabel={zoneById("islas").name[locale]}
          onRegion={(id)=>select(regionById(id).zone,id)} onDestination={pickDestination} onIslands={()=>select("islas",null)} onHover={setHovered}/>
        <p className="chile-map-caption" aria-hidden="true">{hovered??heading??t.hint}</p>
      </div>
    </section>
  );
}
