import { Locale, Place, Category } from "./places";
import { TravellerProfile, TravelInterest } from "./traveller-welcome";
import { openLabel, openStatus } from "./open-status";

const interestCategories:Record<TravelInterest,Category[]>={
  culture:["museum","experience"],food:["food","coffee","market","themed"],nature:["park","view"],free:["park","view","museum"],views:["view","park","stay"],nightlife:["nightlife","themed"],shopping:["shop","market","growshop"],wine:["winery"],snow:["snow"],family:["park","museum","experience"]
};
const copy={
  es:{eyebrow:"SELECCIONADO PARA TI",title:"Tus panoramas recomendados",lede:"Ordenamos los lugares según tus intereses, presupuesto, grupo y ritmo. Puedes cambiar tus preferencias cuando quieras.",match:"Coincide con tu viaje",free:"Gratis",days:"días",people:"personas",see:"Ver ficha y ruta",privacy:"Estas recomendaciones se calculan en tu dispositivo."},
  en:{eyebrow:"PICKED FOR YOU",title:"Your recommended activities",lede:"Places are ranked by your interests, budget, group and pace. You can change your preferences at any time.",match:"Matches your trip",free:"Free",days:"days",people:"people",see:"View details and route",privacy:"These recommendations are calculated on your device."},
  pt:{eyebrow:"ESCOLHIDO PARA VOCÊ",title:"Seus passeios recomendados",lede:"Ordenamos os lugares conforme seus interesses, orçamento, grupo e ritmo. Você pode mudar as preferências quando quiser.",match:"Combina com sua viagem",free:"Grátis",days:"dias",people:"pessoas",see:"Ver detalhes e rota",privacy:"Estas recomendações são calculadas no seu dispositivo."},
  fr:{eyebrow:"CHOISI POUR VOUS",title:"Vos activités recommandées",lede:"Les lieux sont classés selon vos intérêts, budget, groupe et rythme. Vous pouvez modifier vos préférences à tout moment.",match:"Adapté à votre voyage",free:"Gratuit",days:"jours",people:"personnes",see:"Voir la fiche et l’itinéraire",privacy:"Ces recommandations sont calculées sur votre appareil."}
};
const isFree=(place:Place)=>place.rating==="GRATIS"||Boolean(place.access?.es.toLowerCase().includes("gratuit"));

function score(place:Place,profile:TravellerProfile){
  let value=0;
  for(const interest of profile.interests)if(interestCategories[interest].includes(place.category))value+=5;
  if(profile.interests.includes("free")&&isFree(place))value+=8;
  if(profile.budget==="free")value+=isFree(place)?12:-8;
  if(profile.budget==="low")value+=isFree(place)?6:0;
  if(profile.children>0&&["park","museum","experience"].includes(place.category))value+=5;
  if(profile.preferredTime==="morning"&&["coffee","park","market"].includes(place.category))value+=2;
  if(profile.preferredTime==="afternoon"&&["museum","view","shop"].includes(place.category))value+=2;
  if(profile.preferredTime==="evening"&&["food","nightlife","themed","stay"].includes(place.category))value+=3;
  if(profile.avoidStairs){if(["snow"].includes(place.category))value-=6;if(["coffee","food","museum","shop","market"].includes(place.category))value+=2}
  if(profile.transport==="walk"&&["museum","coffee","food","market"].includes(place.category))value+=2;
  return value;
}

export default function PersonalizedRecommendations({locale,profile,places,now,onSelectPlace}:{locale:Locale;profile:TravellerProfile|null;places:Place[];now:Date;onSelectPlace:(place:Place)=>void}){
  if(!profile||!places.length)return null;
  const t=copy[locale];
  const recommended=[...places].sort((a,b)=>score(b,profile)-score(a,profile)).slice(0,6);
  return <section className="personalized" id="para-ti"><div className="personalized-head"><div className="section-heading"><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.lede}</span></div><div className="trip-summary"><b>{profile.partySize}</b> {t.people}<span>·</span><b>{profile.tripDays}</b> {t.days}</div></div>
    <div className="personalized-grid">{recommended.map((place,index)=>{const status=openStatus(place,now);return <article key={place.id}><div className="recommendation-rank">{String(index+1).padStart(2,"0")}</div><div><small>{place.neighborhood}</small><h3>{place.name}</h3><p>{place.summary?.[locale]??place.address??""}</p><div className="recommendation-tags"><span>✓ {t.match}</span>{isFree(place)&&<strong>{t.free}</strong>}{status.state!=="unknown"&&<em className={`open-badge is-${status.state}`}>{openLabel(status,locale,true)}</em>}</div></div><button type="button" onClick={()=>onSelectPlace(place)}>{t.see} →</button></article>})}</div>
    <p className="recommendation-privacy">🔒 {t.privacy}</p>
  </section>;
}
