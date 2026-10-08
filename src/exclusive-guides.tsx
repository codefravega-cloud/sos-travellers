import { FormEvent, useEffect, useState } from "react";
import { Locale } from "./places";
import { guides } from "./guides";
import { formatTravelMoney, RatesResponse } from "./travel-money";

const copy={
  es:{eyebrow:"GUÍAS EXCLUSIVAS",title:"Santiago como local, en tu idioma",lede:"Rutas probadas, precios reales y contactos de confianza en un documento que puedes usar sin internet. Estamos terminando las primeras ediciones: deja tu correo y te avisamos cuando salgan.",pages:"páginas",langs:"ES · EN · PT · FR",popular:"Todo incluido",free:"Gratis con tu correo",launch:"Precio de lanzamiento",buy:"Comprar guía",wantFree:"Quiero la guía gratis",notify:"Avísame del lanzamiento",email:"Tu correo",send:"Anotarme",sending:"Enviando…",success:"Anotado. Te escribiremos a ese correo cuando la guía esté lista.",privacy:"Usamos tu correo solo para avisarte de esta guía.",partners:"Las guías incluyen colaboradores verificados, siempre identificados como tales."},
  en:{eyebrow:"EXCLUSIVE GUIDES",title:"Santiago like a local, in your language",lede:"Tested routes, real prices and trusted contacts in a document you can use offline. We are finishing the first editions: leave your email and we will tell you when they are out.",pages:"pages",langs:"ES · EN · PT · FR",popular:"All included",free:"Free with your email",launch:"Launch price",buy:"Buy guide",wantFree:"I want the free guide",notify:"Tell me at launch",email:"Your email",send:"Sign me up",sending:"Sending…",success:"Noted. We will write to that address when the guide is ready.",privacy:"We only use your email to tell you about this guide.",partners:"Guides include verified partners, always labelled as such."},
  pt:{eyebrow:"GUIAS EXCLUSIVOS",title:"Santiago como um local, no seu idioma",lede:"Rotas testadas, preços reais e contatos confiáveis em um documento que funciona sem internet. Estamos finalizando as primeiras edições: deixe seu e-mail e avisamos no lançamento.",pages:"páginas",langs:"ES · EN · PT · FR",popular:"Tudo incluído",free:"Grátis com seu e-mail",launch:"Preço de lançamento",buy:"Comprar guia",wantFree:"Quero o guia grátis",notify:"Avise-me no lançamento",email:"Seu e-mail",send:"Quero ser avisado",sending:"Enviando…",success:"Anotado. Escreveremos para esse e-mail quando o guia estiver pronto.",privacy:"Usamos seu e-mail apenas para avisar sobre este guia.",partners:"Os guias incluem parceiros verificados, sempre identificados."},
  fr:{eyebrow:"GUIDES EXCLUSIFS",title:"Santiago comme un local, dans votre langue",lede:"Itinéraires testés, prix réels et contacts fiables dans un document utilisable hors ligne. Nous terminons les premières éditions : laissez votre e-mail et nous vous préviendrons à leur sortie.",pages:"pages",langs:"ES · EN · PT · FR",popular:"Tout inclus",free:"Gratuit avec votre e-mail",launch:"Prix de lancement",buy:"Acheter le guide",wantFree:"Je veux le guide gratuit",notify:"Prévenez-moi au lancement",email:"Votre e-mail",send:"M’inscrire",sending:"Envoi…",success:"C’est noté. Nous écrirons à cette adresse quand le guide sera prêt.",privacy:"Votre e-mail sert uniquement à vous prévenir pour ce guide.",partners:"Les guides incluent des partenaires vérifiés, toujours signalés comme tels."},
};

export default function ExclusiveGuides({locale,currency}:{locale:Locale;currency:string}){
  const t=copy[locale];
  const [rates,setRates]=useState<RatesResponse|null>(null);
  const [openId,setOpenId]=useState(""),[doneIds,setDoneIds]=useState<string[]>([]),[status,setStatus]=useState(""),[sending,setSending]=useState(false);
  useEffect(()=>{fetch("/api/rates").then(response=>response.ok?response.json():Promise.reject()).then(setRates).catch(()=>setRates(null))},[]);

  async function submit(event:FormEvent<HTMLFormElement>,guideId:string){
    event.preventDefault();setSending(true);setStatus("");
    const form=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/guide-leads",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guideId,email:form.get("email"),companyWebsite:form.get("companyWebsite"),locale,currency})});
      const data=await response.json() as {error?:string};if(!response.ok) throw new Error(data.error);
      setDoneIds(current=>[...current,guideId]);setOpenId("");
    }catch(error){setStatus(error instanceof Error&&error.message?error.message:"Error")}
    finally{setSending(false)}
  }

  return <section className="guides" id="guias"><div className="section-heading"><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.lede}</span></div>
    <div className="guide-grid">{guides.map(guide=>{
      const g=guide.copy[locale],free=guide.priceClp===0,done=doneIds.includes(guide.id);
      return <article key={guide.id} className={guide.featured?"recommended":undefined}>
        {guide.featured?<span className="guide-flag">{t.popular}</span>:<i aria-hidden="true">{guide.icon}</i>}
        <h3>{g.title}</h3><p>{g.blurb}</p><small>{guide.pages} {t.pages} · {t.langs}</small>
        <ul>{g.open.map(item=><li key={item}>✓ {item}</li>)}{g.locked.map(item=><li key={item} className="locked">🔒 {item}</li>)}</ul>
        <strong className={free?"free":undefined}>{free?t.free:<>{formatTravelMoney(guide.priceClp,currency,locale,rates?.rates??null)}{currency!=="CLP"&&<em> · CLP {new Intl.NumberFormat("es-CL").format(guide.priceClp)}</em>}</>}</strong>
        {!free&&!guide.checkoutUrl&&<small>{t.launch}</small>}
        {done?<p className="guide-done" role="status">{t.success}</p>
          :guide.checkoutUrl?<a className="guide-cta" href={guide.checkoutUrl} target="_blank" rel="noreferrer">{t.buy} ↗</a>
          :openId===guide.id?<form onSubmit={event=>submit(event,guide.id)}><label>{t.email}<input name="email" type="email" required maxLength={160} autoComplete="email" placeholder="nombre@correo.com" autoFocus/></label><label className="honeypot" aria-hidden="true">Company website<input name="companyWebsite" tabIndex={-1} autoComplete="off"/></label><button className="guide-cta" type="submit" disabled={sending}>{sending?t.sending:t.send}</button><small>{t.privacy}</small>{status&&<p role="status">{status}</p>}</form>
          :<button className="guide-cta" type="button" onClick={()=>{setOpenId(guide.id);setStatus("")}}>{free?t.wantFree:t.notify}</button>}
      </article>;
    })}</div>
    <p className="guide-note">{t.partners}</p>
  </section>;
}
