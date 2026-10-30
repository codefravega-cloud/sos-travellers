import { useEffect, useState } from "react";
import { type RegionId, regionById } from "./chile-regions";
import type { Locale } from "./places";

// Services that businesses offer to travellers (api/_routes/services.ts). Only published services of published
// businesses reach this list: the admin approves every one. Categories come from /api/categories; this list is only
// the fallback for when it cannot be reached, with the rows seeded in 202610300002_business_categories.sql.
export type ServiceCategory=string;
export type Category={id:string;names:Partial<Record<Locale,string>>;partnerKind?:string;status?:string;proposedBy?:string};
export type Service={id:number;category:ServiceCategory;title:string;description:string;priceClp?:number;priceFrom:boolean;duration?:string;languages:string[];whatsapp?:string;phone?:string;bookingUrl?:string;photos:string[];business:{id:number;name:string;address?:string;active:boolean;categoryId?:string;lat?:number;lng?:number}};

export const defaultCategories:Category[]=[
  {id:"coffee",names:{es:"Cafeterías",en:"Coffee shops",pt:"Cafeterias",fr:"Cafés"}},
  {id:"food",names:{es:"Comida",en:"Food",pt:"Comida",fr:"Restauration"}},
  {id:"stay",names:{es:"Alojamiento",en:"Stays",pt:"Hospedagem",fr:"Hébergement"}},
  {id:"tour",names:{es:"Tours",en:"Tours",pt:"Passeios",fr:"Excursions"}},
  {id:"guide",names:{es:"Guías",en:"Guides",pt:"Guias",fr:"Guides"}},
  {id:"experience",names:{es:"Experiencias",en:"Experiences",pt:"Experiências",fr:"Expériences"}},
  {id:"adventure",names:{es:"Aventura",en:"Adventure",pt:"Aventura",fr:"Aventure"}},
  {id:"transfer",names:{es:"Traslados",en:"Transfers",pt:"Traslados",fr:"Transferts"}},
  {id:"taxi",names:{es:"Radio taxis",en:"Radio taxis",pt:"Rádio táxis",fr:"Radio-taxis"}},
  {id:"car-rental",names:{es:"Arriendo de autos",en:"Car rental",pt:"Aluguel de carros",fr:"Location de voitures"}},
  {id:"shop",names:{es:"Comercio",en:"Shops",pt:"Comércio",fr:"Commerces"}},
  {id:"nightlife",names:{es:"Vida nocturna",en:"Nightlife",pt:"Vida noturna",fr:"Vie nocturne"}},
  {id:"wellness",names:{es:"Bienestar",en:"Wellness",pt:"Bem-estar",fr:"Bien-être"}},
  {id:"other",names:{es:"Otros",en:"Other",pt:"Outros",fr:"Autres"}},
];
export const categoryName=(list:Category[],id:string,locale:Locale)=>{const names=list.find((item)=>item.id===id)?.names??defaultCategories.find((item)=>item.id===id)?.names;return names?.[locale]||names?.es||id};
export async function fetchCategories():Promise<Category[]>{
  const response=await fetch("/api/categories");
  if(!response.ok)throw new Error("categories");
  const {categories}=await response.json() as {categories?:Category[]};
  return categories?.length?categories:defaultCategories;
}
export function useCategories(load:()=>Promise<Category[]>=fetchCategories){
  const [list,setList]=useState(defaultCategories);
  useEffect(()=>{
    let alive=true;
    load().then((loaded)=>{if(alive)setList(loaded)}).catch(()=>{});
    return()=>{alive=false};
  },[load]);
  return list;
}
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

export default function ServicesBoard({locale,region,loadServices=fetchServices,loadCategories=fetchCategories}:{locale:Locale;region:RegionId;loadServices?:(region:RegionId)=>Promise<Service[]>;loadCategories?:()=>Promise<Category[]>}){
  const [loaded,setLoaded]=useState<{region:RegionId;list:Service[]}|null>(null);
  const [category,setCategory]=useState<ServiceCategory|"">("");
  const categories=useCategories(loadCategories);
  const t=copy[locale];

  useEffect(()=>{
    let alive=true;
    loadServices(region).then((list)=>{if(alive)setLoaded({region,list})}).catch(()=>{if(alive)setLoaded({region,list:[]})});
    return()=>{alive=false};
  },[region,loadServices]);

  const all=loaded?.region===region?loaded.list:null;
  const present=[...new Set(all?.map((service)=>service.category))];
  const shown=all?.filter((service)=>!category||service.category===category);

  return <section className="guides th-promos th-services" id="servicios">
    <div className="section-heading"><p>{t.eyebrow}</p><h2>{t.title} {regionById(region).name}</h2><span>{t.lede}</span></div>
    {present.length>1&&<div className="th-service-filters" role="group" aria-label={t.eyebrow}>
      <button type="button" aria-pressed={!category} onClick={()=>setCategory("")}>{t.all}</button>
      {present.map((item)=><button key={item} type="button" aria-pressed={category===item} onClick={()=>setCategory(item)}>{categoryName(categories,item,locale)}</button>)}
    </div>}
    {shown&&!shown.length&&<p className="th-empty">{t.empty}</p>}
    {!!shown?.length&&<div className="th-promo-grid">{shown.map((service)=><article key={service.id} className="th-service">
      {service.photos[0]&&<img src={service.photos[0]} alt={service.title} loading="lazy"/>}
      <small>{categoryName(categories,service.category,locale)} · {service.business.name}{service.business.active?<em> · ● {t.serving}</em>:null}</small>
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
