"use client";

import { Locale } from "./places";

const copy={
  es:{eyebrow:"CENTRO SOS",title:"Ayuda cuando importa",lede:"Líneas oficiales de emergencia en Chile. Llama solo ante una emergencia real.",ambulance:"Ambulancia · SAMU",fire:"Bomberos",police:"Carabineros",detectives:"PDI",call:"Llamar",nearby:"Servicios cerca de mí",pharmacy:"Farmacias 24 horas",hospital:"Urgencias médicas",station:"Comisarías",share:"Compartir mi ubicación",need:"Primero activa “Usar mi ubicación” en el mapa.",copied:"Ubicación copiada",tip:"Consejo viajero",tipText:"De noche usa transporte autorizado, cuida teléfono y documentos, y confirma siempre la identidad del conductor."},
  en:{eyebrow:"SOS CENTRE",title:"Help when it matters",lede:"Official emergency lines in Chile. Call only for a real emergency.",ambulance:"Ambulance · SAMU",fire:"Fire brigade",police:"Carabineros police",detectives:"PDI detectives",call:"Call",nearby:"Services near me",pharmacy:"24-hour pharmacies",hospital:"Emergency rooms",station:"Police stations",share:"Share my location",need:"First enable “Use my location” on the map.",copied:"Location copied",tip:"Traveller tip",tipText:"At night use authorised transport, protect your phone and documents, and always confirm the driver’s identity."},
  pt:{eyebrow:"CENTRAL SOS",title:"Ajuda quando importa",lede:"Linhas oficiais de emergência no Chile. Ligue somente em emergência real.",ambulance:"Ambulância · SAMU",fire:"Bombeiros",police:"Carabineros",detectives:"PDI",call:"Ligar",nearby:"Serviços perto de mim",pharmacy:"Farmácias 24 horas",hospital:"Emergências médicas",station:"Delegacias",share:"Compartilhar localização",need:"Primeiro ative “Usar minha localização” no mapa.",copied:"Localização copiada",tip:"Dica ao viajante",tipText:"À noite use transporte autorizado, proteja celular e documentos e confirme a identidade do motorista."},
  fr:{eyebrow:"CENTRE SOS",title:"De l’aide quand il le faut",lede:"Numéros officiels d’urgence au Chili. Appelez uniquement en cas d’urgence réelle.",ambulance:"Ambulance · SAMU",fire:"Pompiers",police:"Carabineros",detectives:"PDI",call:"Appeler",nearby:"Services près de moi",pharmacy:"Pharmacies 24 h",hospital:"Urgences médicales",station:"Commissariats",share:"Partager ma position",need:"Activez d’abord « Utiliser ma position » sur la carte.",copied:"Position copiée",tip:"Conseil voyageur",tipText:"La nuit, utilisez un transport autorisé, protégez téléphone et documents et vérifiez l’identité du chauffeur."}
};
const services=[{key:"ambulance",number:"131",icon:"✚"},{key:"fire",number:"132",icon:"♨"},{key:"police",number:"133",icon:"★"},{key:"detectives",number:"134",icon:"◆"}] as const;

export default function SafetyHub({locale,coords}:{locale:Locale;coords:[number,number]|null}){
  const t=copy[locale];
  async function shareLocation(){
    if(!coords){window.alert(t.need);return;}
    const url=`https://www.google.com/maps?q=${coords[0]},${coords[1]}`;
    if(navigator.share) await navigator.share({title:"SOS Travellers · ubicación",url});
    else {await navigator.clipboard.writeText(url);window.alert(t.copied);}
  }
  return <section className="safety" id="sos"><div className="section-heading light"><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.lede}</span></div><div className="emergency-grid">{services.map(item=><a key={item.number} href={`tel:${item.number}`}><i>{item.icon}</i><span>{t[item.key]}<b>{item.number}</b></span><strong>{t.call} →</strong></a>)}</div><div className="safety-actions"><div><h3>{t.nearby}</h3><a href="https://www.google.com/maps/search/?api=1&query=farmacia+24+horas+cerca" target="_blank" rel="noreferrer">{t.pharmacy} ↗</a><a href="https://www.google.com/maps/search/?api=1&query=urgencia+hospital+cerca" target="_blank" rel="noreferrer">{t.hospital} ↗</a><a href="https://www.google.com/maps/search/?api=1&query=comisaria+cerca" target="_blank" rel="noreferrer">{t.station} ↗</a></div><button type="button" onClick={shareLocation}>⌖ {t.share}</button><aside><b>{t.tip}</b><p>{t.tipText}</p></aside></div></section>;
}
