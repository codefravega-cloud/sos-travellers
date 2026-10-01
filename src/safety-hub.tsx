import { useEffect, useState } from "react";
import { Locale } from "./places";

const copy={
  es:{eyebrow:"CENTRO SOS",title:"Ayuda cuando importa",lede:"Líneas oficiales de emergencia en Chile. Los botones hacen una llamada telefónica normal: nunca FaceTime ni videollamada.",ambulance:"Ambulancia · SAMU",fire:"Bomberos",police:"Carabineros",detectives:"PDI",call:"Llamada telefónica",nearby:"Servicios cerca de mí",pharmacy:"Farmacias de turno · MINSAL",pharmacyMeta:"Turnos oficiales actualizados diariamente",hospital:"Urgencias médicas",station:"Comisarías",share:"Compartir mi ubicación",need:"Primero activa “Usar mi ubicación” o marca tu punto en el mapa.",copied:"Ubicación copiada",tip:"Consejo viajero",tipText:"De noche usa transporte autorizado, cuida teléfono y documentos, y confirma siempre la identidad del conductor."},
  en:{eyebrow:"SOS CENTRE",title:"Help when it matters",lede:"Official emergency lines in Chile. Buttons make a normal phone call—never FaceTime or a video call.",ambulance:"Ambulance · SAMU",fire:"Fire brigade",police:"Carabineros police",detectives:"PDI detectives",call:"Phone call",nearby:"Services near me",pharmacy:"On-duty pharmacies · MINSAL",pharmacyMeta:"Official shifts updated daily",hospital:"Emergency rooms",station:"Police stations",share:"Share my location",need:"First enable “Use my location” or mark your point on the map.",copied:"Location copied",tip:"Traveller tip",tipText:"At night use authorised transport, protect your phone and documents, and always confirm the driver’s identity."},
  pt:{eyebrow:"CENTRAL SOS",title:"Ajuda quando importa",lede:"Linhas oficiais de emergência no Chile. Os botões fazem ligação telefônica normal, nunca FaceTime ou videochamada.",ambulance:"Ambulância · SAMU",fire:"Bombeiros",police:"Carabineros",detectives:"PDI",call:"Ligação telefônica",nearby:"Serviços perto de mim",pharmacy:"Farmácias de plantão · MINSAL",pharmacyMeta:"Plantões oficiais atualizados diariamente",hospital:"Emergências médicas",station:"Delegacias",share:"Compartilhar localização",need:"Primeiro ative sua localização ou marque o ponto no mapa.",copied:"Localização copiada",tip:"Dica ao viajante",tipText:"À noite use transporte autorizado, proteja celular e documentos e confirme a identidade do motorista."},
  fr:{eyebrow:"CENTRE SOS",title:"De l’aide quand il le faut",lede:"Numéros officiels d’urgence au Chili. Les boutons passent un appel téléphonique normal, jamais FaceTime ni vidéo.",ambulance:"Ambulance · SAMU",fire:"Pompiers",police:"Carabineros",detectives:"PDI",call:"Appel téléphonique",nearby:"Services près de moi",pharmacy:"Pharmacies de garde · MINSAL",pharmacyMeta:"Gardes officielles actualisées chaque jour",hospital:"Urgences médicales",station:"Commissariats",share:"Partager ma position",need:"Activez la position ou marquez votre point sur la carte.",copied:"Position copiée",tip:"Conseil voyageur",tipText:"La nuit, utilisez un transport autorisé, protégez téléphone et documents et vérifiez l’identité du chauffeur."}
};
const services=[{key:"ambulance",number:"131",icon:"✚"},{key:"fire",number:"132",icon:"♨"},{key:"police",number:"133",icon:"★"},{key:"detectives",number:"134",icon:"◆"}] as const;
const pharmacyMapsCopy:Record<Locale,string>={es:"Farmacias cercanas en Google Maps",en:"Nearby pharmacies on Google Maps",pt:"Farmácias próximas no Google Maps",fr:"Pharmacies proches sur Google Maps"};
const pharmacyDateCopy:Record<Locale,string>={es:"Turno vigente para",en:"On-duty schedule for",pt:"Plantão vigente para",fr:"Garde en vigueur pour"};
const dateLocales:Record<Locale,string>={es:"es-CL",en:"en-GB",pt:"pt-BR",fr:"fr-FR"};

export default function SafetyHub({locale,coords}:{locale:Locale;coords:[number,number]|null}){
  const t=copy[locale];
  const [today,setToday]=useState("");
  useEffect(()=>{
    const update=()=>setToday(new Intl.DateTimeFormat(dateLocales[locale],{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"America/Santiago"}).format(new Date()));
    update();
    const timer=window.setInterval(update,60000);
    return()=>window.clearInterval(timer);
  },[locale]);
  const near=(query:string)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} cerca de ${coords?`${coords[0]},${coords[1]}`:"Santiago Chile"}`)}`;
  async function shareLocation(){
    if(!coords){window.alert(t.need);return;}
    const url=`https://www.google.com/maps?q=${coords[0]},${coords[1]}`;
    if(navigator.share) await navigator.share({title:"SOS Travellers · ubicación",url});
    else {await navigator.clipboard.writeText(url);window.alert(t.copied);}
  }
  return <section className="safety" id="sos"><div className="section-heading light"><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.lede}</span></div><div className="emergency-grid">{services.map(item=><a key={item.number} href={`tel:${item.number}`}><i>{item.icon}</i><span>{t[item.key]}<b>{item.number}</b></span><strong>☎ {t.call} →</strong></a>)}</div><div className="safety-actions"><div><h3>{t.nearby}</h3><a className="pharmacy-duty" href="https://seremienlinea.minsal.cl/asdigital/index.php?mfarmacias=" target="_blank" rel="noopener noreferrer">{t.pharmacy} ↗<small>{today?`${pharmacyDateCopy[locale]} ${today}`:t.pharmacyMeta}</small></a><a href={near("farmacia abierta ahora")} target="_blank" rel="noopener noreferrer">{pharmacyMapsCopy[locale]} ↗</a><a href={near("urgencia hospital")} target="_blank" rel="noopener noreferrer">{t.hospital} ↗</a><a href={near("comisaria Carabineros")} target="_blank" rel="noopener noreferrer">{t.station} ↗</a></div><button type="button" onClick={shareLocation}>⌖ {t.share}</button><aside><b>{t.tip}</b><p>{t.tipText}</p></aside></div></section>;
}
