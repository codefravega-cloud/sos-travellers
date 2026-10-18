import { useEffect, useState } from "react";
import { Locale } from "./places";
import { RegionId } from "./chile-regions";

type EventItem={id:number;title:string;venue:string;category:string;startsAt:string;endsAt?:string;priceLabel?:string;url?:string;summary?:Record<Locale,string>;featured:boolean};
type Range="today"|"tonight"|"week";

const ZONE="America/Santiago",NIGHT_FROM=19;
const dateLocales:Record<Locale,string>={es:"es-CL",en:"en-GB",pt:"pt-BR",fr:"fr-FR"};
// Official listings only: the site links out instead of copying third-party programmes.
const boards=[
  {name:"Movistar Arena · Santander Arena",kind:"arena",url:"https://www.santanderarena.cl/"},
  {name:"Teatro Caupolicán",kind:"arena",url:"https://www.teatrocaupolican.cl/"},
  {name:"Teatro Municipal de Santiago",kind:"stage",url:"https://municipal.cl/"},
  {name:"GAM · Centro Gabriela Mistral",kind:"stage",url:"https://gam.cl/"},
  {name:"Santiago Cultura",kind:"free",url:"https://www.santiagocultura.cl/"},
  {name:"PuntoTicket",kind:"tickets",url:"https://www.puntoticket.com/"},
  {name:"Ticketmaster Chile",kind:"tickets",url:"https://www.ticketmaster.cl/"},
] as const;

const copy={
  es:{eyebrow:"QUÉ PASA HOY",title:"Eventos espontáneos",lede:"Conciertos, circos, ferias y panoramas de los próximos días. Confirma siempre horario y entradas en el sitio oficial antes de salir.",today:"Hoy",tonight:"Esta noche",week:"Esta semana",none:"No tenemos eventos cargados para este momento. Revisa las carteleras oficiales.",featured:"Destacado",info:"Ver evento",boards:"Carteleras oficiales",kinds:{arena:"Conciertos y shows",stage:"Teatro, danza y música",free:"Agenda municipal · mucho gratis",tickets:"Entradas · circos y festivales"},promote:"¿Organizas un evento? Publícalo o destácalo"},
  en:{eyebrow:"WHAT’S ON TODAY",title:"Spontaneous events",lede:"Concerts, circuses, fairs and things to do over the next few days. Always confirm times and tickets on the official site before leaving.",today:"Today",tonight:"Tonight",week:"This week",none:"We have no events loaded for this moment. Check the official listings.",featured:"Featured",info:"See event",boards:"Official listings",kinds:{arena:"Concerts and shows",stage:"Theatre, dance and music",free:"City agenda · much of it free",tickets:"Tickets · circuses and festivals"},promote:"Running an event? List or feature it"},
  pt:{eyebrow:"O QUE ROLA HOJE",title:"Eventos espontâneos",lede:"Shows, circos, feiras e passeios dos próximos dias. Confirme sempre horário e ingressos no site oficial antes de sair.",today:"Hoje",tonight:"Esta noite",week:"Esta semana",none:"Não temos eventos carregados para este momento. Veja as programações oficiais.",featured:"Destaque",info:"Ver evento",boards:"Programações oficiais",kinds:{arena:"Shows e concertos",stage:"Teatro, dança e música",free:"Agenda municipal · muito gratuito",tickets:"Ingressos · circos e festivais"},promote:"Organiza um evento? Publique ou destaque"},
  fr:{eyebrow:"À FAIRE AUJOURD’HUI",title:"Événements spontanés",lede:"Concerts, cirques, foires et sorties des prochains jours. Vérifiez toujours horaires et billets sur le site officiel avant de partir.",today:"Aujourd’hui",tonight:"Ce soir",week:"Cette semaine",none:"Aucun événement chargé pour ce moment. Consultez les programmes officiels.",featured:"À la une",info:"Voir l’événement",boards:"Programmes officiels",kinds:{arena:"Concerts et spectacles",stage:"Théâtre, danse et musique",free:"Agenda municipal · souvent gratuit",tickets:"Billets · cirques et festivals"},promote:"Vous organisez un événement ? Publiez-le ou mettez-le en avant"},
};

const dayKey=(date:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:ZONE}).format(date);
const hourOf=(date:Date)=>Number(new Intl.DateTimeFormat("en-GB",{timeZone:ZONE,hour:"2-digit",hourCycle:"h23"}).format(date));

export default function EventsToday({locale,region,now}:{locale:Locale;region:RegionId;now:Date}){
  const t=copy[locale];
  const [loaded,setLoaded]=useState<{region:RegionId;events:EventItem[]}>({region,events:[]});
  const [range,setRange]=useState<Range>("today");
  useEffect(()=>{
    let active=true;
    fetch(`/api/events?region=${region}`).then(response=>response.ok?response.json():Promise.reject()).then((data:{events?:EventItem[]})=>{if(active) setLoaded({region,events:data.events??[]})}).catch(()=>{if(active) setLoaded({region,events:[]})});
    return()=>{active=false};
  },[region]);
  const events=loaded.region===region?loaded.events:[];
  const today=dayKey(now);
  const shown=events.filter(event=>{
    const start=new Date(event.startsAt);
    return range==="week"||(dayKey(start)===today&&(range==="today"||hourOf(start)>=NIGHT_FROM));
  });
  // Outside Santiago there are no listings to fall back on, so the section only appears with events.
  if(region!=="RM"&&!events.length) return null;
  const when=new Intl.DateTimeFormat(dateLocales[locale],{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:ZONE});
  return <section className="events-today" id="hoy"><div className="section-heading"><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.lede}</span></div>
    <div className="event-ranges" role="group" aria-label={t.eyebrow}>{(["today","tonight","week"] as const).map(key=><button type="button" key={key} className={range===key?"active":""} aria-pressed={range===key} onClick={()=>setRange(key)}>{t[key]}</button>)}</div>
    {shown.length?<div className="event-grid">{shown.map(event=><article key={event.id} className={event.featured?"recommended":undefined}>
      {event.featured&&<span className="event-flag">{t.featured}</span>}
      <time dateTime={event.startsAt}>{when.format(new Date(event.startsAt))}</time><h3>{event.title}</h3><small>{event.venue}</small>
      {event.summary?.[locale]&&<p>{event.summary[locale]}</p>}
      {event.priceLabel&&<strong>{event.priceLabel}</strong>}
      {event.url&&<a href={event.url} target="_blank" rel={event.featured?"sponsored noopener noreferrer":"noopener noreferrer"}>{t.info} ↗</a>}
    </article>)}</div>:<p className="event-empty" role="status">{t.none}</p>}
    {region==="RM"&&<div className="event-boards"><h3>{t.boards}</h3><div>{boards.map(board=><a key={board.url} href={board.url} target="_blank" rel="noopener noreferrer"><b>{board.name}</b><span>{t.kinds[board.kind]}</span><i aria-hidden="true">↗</i></a>)}</div></div>}
    <a className="event-promote" href="#negocios">{t.promote} →</a>
  </section>;
}
