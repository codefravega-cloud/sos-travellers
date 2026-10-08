import { FormEvent, useEffect, useState } from "react";
import { Locale } from "./places";

// Opened from the NFC tag or QR code of a business (/r/<id>): a traveller leaves a review without installing anything.
type Business={id:number;name:string;reviewPlaceId:string};

const copy:Record<Locale,{eyebrow:string;title:string;lede:string;rating:string;stars:(n:number)=>string;name:string;comment:string;send:string;sending:string;thanks:string;thanksLede:string;site:string;missing:string;error:string}>={
  es:{eyebrow:"TU OPINIÓN",title:"¿Cómo estuvo tu visita?",lede:"Tu opinión ayuda a otros viajeros a elegir.",rating:"Tu nota",stars:(n)=>`${n} de 5 estrellas`,name:"Tu nombre",comment:"Tu opinión",send:"Enviar opinión",sending:"Enviando…",thanks:"¡Gracias!",thanksLede:"Tu opinión ya está publicada.",site:"Ver más lugares en SOS Travellers",missing:"No encontramos este local.",error:"No pudimos guardar tu opinión. Intenta nuevamente."},
  en:{eyebrow:"YOUR REVIEW",title:"How was your visit?",lede:"Your review helps other travellers choose.",rating:"Your rating",stars:(n)=>`${n} out of 5 stars`,name:"Your name",comment:"Your review",send:"Send review",sending:"Sending…",thanks:"Thank you!",thanksLede:"Your review is now published.",site:"See more places on SOS Travellers",missing:"We could not find this place.",error:"We could not save your review. Please try again."},
  pt:{eyebrow:"SUA OPINIÃO",title:"Como foi sua visita?",lede:"Sua opinião ajuda outros viajantes a escolher.",rating:"Sua nota",stars:(n)=>`${n} de 5 estrelas`,name:"Seu nome",comment:"Sua opinião",send:"Enviar opinião",sending:"Enviando…",thanks:"Obrigado!",thanksLede:"Sua opinião já está publicada.",site:"Ver mais lugares no SOS Travellers",missing:"Não encontramos este local.",error:"Não foi possível salvar sua opinião. Tente novamente."},
  fr:{eyebrow:"VOTRE AVIS",title:"Comment s’est passée votre visite ?",lede:"Votre avis aide d’autres voyageurs à choisir.",rating:"Votre note",stars:(n)=>`${n} étoiles sur 5`,name:"Votre nom",comment:"Votre avis",send:"Envoyer l’avis",sending:"Envoi…",thanks:"Merci !",thanksLede:"Votre avis est publié.",site:"Voir plus de lieux sur SOS Travellers",missing:"Lieu introuvable.",error:"Impossible d’enregistrer votre avis. Réessayez."},
};
const names:Record<Locale,string>={es:"Español",en:"English",pt:"Português",fr:"Français"};

// The language saved by the site, else the phone's, else Spanish.
function initialLocale():Locale{
  const known=(value:string|null|undefined)=>(value&&value.slice(0,2) in copy?value.slice(0,2) as Locale:null);
  let saved:string|null=null;
  try{saved=localStorage.getItem("sos-language")}catch{}
  return known(saved)??known(navigator.language)??"es";
}

export default function ReviewLink({businessId}:{businessId:number}){
  const [locale,setLocale]=useState<Locale>(initialLocale);
  const [business,setBusiness]=useState<Business|null|undefined>(undefined);
  const [rating,setRating]=useState(0);
  const [state,setState]=useState<"idle"|"sending"|"sent">("idle");
  const [error,setError]=useState("");
  const t=copy[locale];

  useEffect(()=>{
    let alive=true;
    fetch(`/api/business?id=${businessId}`).then((response)=>response.ok?response.json():Promise.reject())
      .then((data:{business:Business})=>{if(alive)setBusiness(data.business)}).catch(()=>{if(alive)setBusiness(null)});
    return()=>{alive=false};
  },[businessId]);
  useEffect(()=>{document.documentElement.lang=locale;if(business)document.title=`${business.name} · SOS Travellers`},[locale,business]);

  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!business)return;
    const form=new FormData(event.currentTarget);
    setState("sending");setError("");
    try{
      const response=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({placeId:business.reviewPlaceId,authorName:form.get("authorName"),comment:form.get("comment"),rating,website:form.get("website")})});
      if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error);
      setState("sent");
    }catch(cause){
      // Validation messages come from the API in Spanish; anything else gets the local wording.
      setError(locale==="es"&&cause instanceof Error&&cause.message?cause.message:t.error);
      setState("idle");
    }
  }

  return <main className="team team-gate review-link">
    <div className="review-card">
      <div className="review-head">
        <p className="team-eyebrow">SOS TRAVELLERS · {t.eyebrow}</p>
        <label><span className="panel-hidden">Idioma</span><select value={locale} onChange={(event)=>setLocale(event.target.value as Locale)}>{(Object.keys(names) as Locale[]).map((id)=><option key={id} value={id}>{names[id]}</option>)}</select></label>
      </div>
      {business===undefined?null:business===null?<><h1>{t.missing}</h1><a className="panel-link" href="/">{t.site} →</a></>
        :state==="sent"?<><h1>{t.thanks}</h1><p>{t.thanksLede}</p><a className="panel-link" href="/">{t.site} →</a></>
        :<form onSubmit={send}>
          <h1>{business.name}</h1>
          <p><b>{t.title}</b> {t.lede}</p>
          <fieldset className="review-stars"><legend>{t.rating}</legend>{[1,2,3,4,5].map((value)=><button key={value} type="button" aria-label={t.stars(value)} aria-pressed={rating===value} className={value<=rating?"on":""} onClick={()=>setRating(value)}>★</button>)}</fieldset>
          <label htmlFor="review-name">{t.name}</label><input id="review-name" name="authorName" minLength={2} maxLength={40} required autoComplete="given-name"/>
          <label htmlFor="review-comment">{t.comment}</label><textarea id="review-comment" name="comment" rows={4} minLength={5} maxLength={400} required/>
          <input className="panel-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
          <button type="submit" disabled={state==="sending"||rating===0}>{state==="sending"?t.sending:t.send}</button>
          {error&&<p className="team-error" role="alert">{error}</p>}
        </form>}
    </div>
  </main>;
}
