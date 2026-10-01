import type { Locale } from "./places";

export type RegionId = "AP"|"TA"|"AN"|"AT"|"CO"|"VS"|"RM"|"LI"|"ML"|"NB"|"BI"|"AR"|"LR"|"LL"|"AI"|"MA";
export type ZoneId = "norte-grande"|"norte-chico"|"centro"|"sur"|"patagonia"|"islas";

export type Zone = { id:ZoneId; name:Record<Locale,string>; regions:RegionId[] };
export type Region = { id:RegionId; name:string; zone:ZoneId; capital:string; center:[number,number]; zoom:number };
export type Destination = { id:string; name:string; region:RegionId; coords:[number,number]; island?:boolean; aliases?:string[] };

// North to south. "islas" has no polygon on the hero map: it is drawn as an inset.
export const zones:Zone[] = [
  { id:"norte-grande", name:{es:"Norte Grande",en:"Far North",pt:"Norte Grande",fr:"Grand Nord"}, regions:["AP","TA","AN"] },
  { id:"norte-chico", name:{es:"Norte Chico",en:"Near North",pt:"Norte Chico",fr:"Petit Nord"}, regions:["AT","CO"] },
  { id:"centro", name:{es:"Zona Central",en:"Central Chile",pt:"Zona Central",fr:"Centre"}, regions:["VS","RM","LI","ML","NB","BI"] },
  { id:"sur", name:{es:"Sur y Lagos",en:"Lake District",pt:"Sul e Lagos",fr:"Sud et lacs"}, regions:["AR","LR","LL"] },
  { id:"patagonia", name:{es:"Patagonia",en:"Patagonia",pt:"Patagônia",fr:"Patagonie"}, regions:["AI","MA"] },
  { id:"islas", name:{es:"Islas",en:"Islands",pt:"Ilhas",fr:"Îles"}, regions:["VS"] },
];

// center/zoom frame the Leaflet map on the region's main visitor area.
export const regions:Region[] = [
  { id:"AP", name:"Arica y Parinacota", zone:"norte-grande", capital:"Arica", center:[-18.48,-70.31], zoom:9 },
  { id:"TA", name:"Tarapacá", zone:"norte-grande", capital:"Iquique", center:[-20.21,-70.15], zoom:9 },
  { id:"AN", name:"Antofagasta", zone:"norte-grande", capital:"Antofagasta", center:[-23.2,-69.3], zoom:8 },
  { id:"AT", name:"Atacama", zone:"norte-chico", capital:"Copiapó", center:[-27.37,-70.33], zoom:8 },
  { id:"CO", name:"Coquimbo", zone:"norte-chico", capital:"La Serena", center:[-29.95,-71.1], zoom:9 },
  { id:"VS", name:"Valparaíso", zone:"centro", capital:"Valparaíso", center:[-33.04,-71.5], zoom:10 },
  { id:"RM", name:"Metropolitana de Santiago", zone:"centro", capital:"Santiago", center:[-33.45,-70.66], zoom:11 },
  { id:"LI", name:"O'Higgins", zone:"centro", capital:"Rancagua", center:[-34.4,-71.2], zoom:9 },
  { id:"ML", name:"Maule", zone:"centro", capital:"Talca", center:[-35.43,-71.66], zoom:9 },
  { id:"NB", name:"Ñuble", zone:"centro", capital:"Chillán", center:[-36.61,-72.1], zoom:9 },
  { id:"BI", name:"Biobío", zone:"centro", capital:"Concepción", center:[-36.83,-73.05], zoom:9 },
  { id:"AR", name:"La Araucanía", zone:"sur", capital:"Temuco", center:[-38.95,-72.2], zoom:9 },
  { id:"LR", name:"Los Ríos", zone:"sur", capital:"Valdivia", center:[-39.82,-73.0], zoom:9 },
  { id:"LL", name:"Los Lagos", zone:"sur", capital:"Puerto Montt", center:[-41.6,-73.0], zoom:8 },
  { id:"AI", name:"Aysén", zone:"patagonia", capital:"Coyhaique", center:[-45.9,-72.6], zoom:7 },
  { id:"MA", name:"Magallanes", zone:"patagonia", capital:"Punta Arenas", center:[-52.0,-72.0], zoom:7 },
];

export const destinations:Destination[] = [
  { id:"arica", name:"Arica", region:"AP", coords:[-18.478,-70.321] },
  { id:"putre", name:"Putre", region:"AP", coords:[-18.195,-69.559], aliases:["lauca"] },
  { id:"iquique", name:"Iquique", region:"TA", coords:[-20.214,-70.152] },
  { id:"san-pedro-de-atacama", name:"San Pedro de Atacama", region:"AN", coords:[-22.911,-68.2], aliases:["atacama","valle de la luna","tatio"] },
  { id:"antofagasta", name:"Antofagasta", region:"AN", coords:[-23.65,-70.4] },
  { id:"bahia-inglesa", name:"Bahía Inglesa", region:"AT", coords:[-27.105,-70.855], aliases:["caldera"] },
  { id:"la-serena", name:"La Serena", region:"CO", coords:[-29.905,-71.25], aliases:["coquimbo"] },
  { id:"pisco-elqui", name:"Pisco Elqui", region:"CO", coords:[-30.123,-70.494], aliases:["valle del elqui","vicuna","elqui"] },
  { id:"valparaiso", name:"Valparaíso", region:"VS", coords:[-33.047,-71.613], aliases:["valpo"] },
  { id:"vina-del-mar", name:"Viña del Mar", region:"VS", coords:[-33.024,-71.552] },
  { id:"santiago", name:"Santiago", region:"RM", coords:[-33.449,-70.669] },
  { id:"cajon-del-maipo", name:"Cajón del Maipo", region:"RM", coords:[-33.64,-70.352], aliases:["san jose de maipo"] },
  { id:"santa-cruz", name:"Santa Cruz · Colchagua", region:"LI", coords:[-34.639,-71.365], aliases:["valle de colchagua"] },
  { id:"pichilemu", name:"Pichilemu", region:"LI", coords:[-34.387,-72.004], aliases:["punta de lobos"] },
  { id:"talca", name:"Talca", region:"ML", coords:[-35.427,-71.655], aliases:["radal siete tazas"] },
  { id:"chillan", name:"Chillán", region:"NB", coords:[-36.607,-72.103], aliases:["nevados de chillan","termas de chillan"] },
  { id:"concepcion", name:"Concepción", region:"BI", coords:[-36.827,-73.05] },
  { id:"temuco", name:"Temuco", region:"AR", coords:[-38.739,-72.59] },
  { id:"pucon", name:"Pucón", region:"AR", coords:[-39.272,-71.977], aliases:["villarrica"] },
  { id:"valdivia", name:"Valdivia", region:"LR", coords:[-39.814,-73.246] },
  { id:"puerto-varas", name:"Puerto Varas", region:"LL", coords:[-41.319,-72.985], aliases:["frutillar","puerto montt","osorno"] },
  { id:"castro", name:"Castro · Chiloé", region:"LL", coords:[-42.482,-73.762], aliases:["chiloe","ancud"] },
  { id:"coyhaique", name:"Coyhaique", region:"AI", coords:[-45.571,-72.068], aliases:["carretera austral"] },
  { id:"puerto-rio-tranquilo", name:"Puerto Río Tranquilo", region:"AI", coords:[-46.624,-72.675], aliases:["capillas de marmol"] },
  { id:"caleta-tortel", name:"Caleta Tortel", region:"AI", coords:[-47.797,-73.535] },
  { id:"puerto-natales", name:"Puerto Natales", region:"MA", coords:[-51.727,-72.506], aliases:["torres del paine"] },
  { id:"punta-arenas", name:"Punta Arenas", region:"MA", coords:[-53.163,-70.917], aliases:["estrecho de magallanes"] },
  { id:"hanga-roa", name:"Rapa Nui · Hanga Roa", region:"VS", coords:[-27.15,-109.433], island:true, aliases:["isla de pascua","easter island","ile de paques","ilha de pascoa"] },
  { id:"juan-fernandez", name:"Juan Fernández", region:"VS", coords:[-33.637,-78.83], island:true, aliases:["robinson crusoe"] },
];

export const regionById = (id:RegionId) => regions.find((region)=>region.id===id)!;
export const zoneById = (id:ZoneId) => zones.find((zone)=>zone.id===id)!;

export function normalize(value:string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
}
