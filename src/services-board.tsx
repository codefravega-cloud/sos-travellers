import { useEffect, useState } from "react";
import { type RegionId, regionById } from "./chile-regions";
import type { Locale } from "./places";

// Services that businesses offer to travellers (api/_routes/services.ts). Only published services of published
// businesses reach this list: the admin approves every one. Category ids mirror api/_routes/_services.ts.
export type ServiceCategory="tour"|"transfer"|"stay"|"food"|"experience"|"guide"|"other";
export type Service={id:number;category:ServiceCategory;title:string;description:string;priceClp?:number;priceFrom:boolean;duration?:string;languages:string[];whatsapp?:string;phone?:string;bookingUrl?:string;photos:string[];business:{id:number;name:string;address?:string;active:boolean}};

export const serviceCategories:ServiceCategory[]=["tour","transfer","stay","food","experience","guide","other"];
export const categoryNames:Record<Locale,Record<ServiceCategory,string>>={
  es:{tour:"Tours",transfer:"Traslados",stay:"Alojamiento",food:"Comida",experience:"Experiencias",guide:"Guías",other:"Otros"},
  en:{tour:"Tours",transfer:"Transfers",stay:"Stays",food:"Food",experience:"Experiences",guide:"Guides",other:"Other"},
  pt:{tour:"Passeios",transfer:"Traslados",stay:"Hospedagem",food:"Comida",experience:"Experiências",guide:"Guias",other:"Outros"},
  fr:{tour:"Excursions",transfer:"Transferts",stay:"Hébergement",food:"Restauration",experience:"Expériences",guide:"Guides",other:"Autres"},
};
const copy:Record<Locale,{eyebrow:string;title:string;lede:string;all:string;empty:string;from:string;agreed:string;languages:string;book:string;call:string;serving:string}>={
  es:{eyebrow:"SERVICIOS VERIFICADOS",title:"Servicios en",lede:"Tours, traslados y más, ofrecidos por empresas que revisa el equipo de SOS Travellers. Reserva directo con ellas.",all:"Todos",empty:"Todavía no hay servicios publicados en esta región.",from:"Desde",agreed:"Precio a convenir",languages:"Idiomas",book:"Reservar",call:"Llamar",serving:"Atendiendo ahora"},
  en:{eyebrow:"VERIFIED SERVICES",title:"Services in",lede:"Tours, transfers and more from businesses checked by the SOS Travellers team. Book directly with them.",all:"All",empty:"No services published in this region yet.",from:"From",agreed:"Price on request",languages:"Languages",book:"Book",call:"Call",serving:"Open now"},
  pt:{eyebrow:"SERVIÇOS VERIFICADOS",title:"Serviços em",lede:"Passeios, traslados e mais, de empresas revisadas pela equipe SOS Travellers. Reserve direto com elas.",all:"Todos",empty:"Ainda não há serviços publicados nesta região.",from:"A partir de",agreed:"Preço a combinar",languages:"Idiomas",book:"Reservar",call:"Ligar",serving:"Atendendo agora"},
  fr:{eyebrow:"SERVICES VÉRIFIÉS",title:"Services :",lede:"Excursions, transferts et plus, proposés par des entreprises vérifiées par l’équipe SOS Travellers. Réservez directement auprès d’elles.",all:"Tous",empty:"Pas encore de services publiés dans cette région.",from:"À partir de",agreed:"Prix sur demande",languages:"Langues",book:"Réserver",call:"Appeler",serving:"Ouvert maintenant"},
};

export async function fetchServices(region:RegionId):Promise<Service[]>{
  const response=await fetch(`/api/services?region=${region}`);
  if(!response.ok)throw new Error("services");
  return ((await response.json()) as {services?:Service[]}).services??[];
}

export const priceLabel=(service:Pick<Service,"priceClp"|"priceFrom">,locale:Locale)=>service.priceClp===undefined?copy[locale].agreed
  :`${service.priceFrom?`${copy[locale].from} `:""}${new Intl.NumberFormat(locale==="es"?"es-CL":locale,{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(service.priceClp)}`;
const whatsappLink=(number:string)=>`https://wa.me/${number.replace(/\D/g,"")}`;

export default function ServicesBoard({locale,region,loadServices=fetchServices}:{locale:Locale;region:RegionId;loadServices?:(region:RegionId)=>Promise<Service[]>}){
  const [loaded,setLoaded]=useState<{region:RegionId;list:Service[]}|null>(null);
  const [category,setCategory]=useState<ServiceCategory|"">("");
  const t=copy[locale];

  useEffect(()=>{
    let alive=true;
    loadServices(region).then((list)=>{if(alive)setLoaded({region,list})}).catch(()=>{if(alive)setLoaded({region,list:[]})});
    return()=>{alive=false};
  },[region,loadServices]);

  const all=loaded?.region===region?loaded.list:null;
  const present=serviceCategories.filter((item)=>all?.some((service)=>service.category===item));
  const shown=all?.filter((service)=>!category||service.category===category);

  return <section className="guides th-promos th-services" id="servicios">
    <div className="section-heading"><p>{t.eyebrow}</p><h2>{t.title} {regionById(region).name}</h2><span>{t.lede}</span></div>
    {present.length>1&&<div className="th-service-filters" role="group" aria-label={t.eyebrow}>
      <button type="button" aria-pressed={!category} onClick={()=>setCategory("")}>{t.all}</button>
      {present.map((item)=><button key={item} type="button" aria-pressed={category===item} onClick={()=>setCategory(item)}>{categoryNames[locale][item]}</button>)}
    </div>}
    {shown&&!shown.length&&<p className="th-empty">{t.empty}</p>}
    {!!shown?.length&&<div className="th-promo-grid">{shown.map((service)=><article key={service.id} className="th-service">
      {service.photos[0]&&<img src={service.photos[0]} alt={service.title} loading="lazy"/>}
      <small>{categoryNames[locale][service.category]} · {service.business.name}{service.business.active?<em> · ● {t.serving}</em>:null}</small>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <b className="th-price">{priceLabel(service,locale)}{service.duration?` · ${service.duration}`:""}</b>
      {service.languages.length>0&&<span>{t.languages}: {service.languages.join(" · ")}</span>}
      {service.business.address&&<span>{service.business.address}</span>}
      <div className="th-service-actions">
        {service.whatsapp&&<a href={whatsappLink(service.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        {service.phone&&<a href={`tel:${service.phone.replace(/[^\d+]/g,"")}`}>{t.call}</a>}
        {service.bookingUrl&&<a href={service.bookingUrl} target="_blank" rel="noopener noreferrer">{t.book} ↗</a>}
      </div>
    </article>)}</div>}
  </section>;
}
