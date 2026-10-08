import type { Session } from "@supabase/supabase-js";
import qrcode from "qrcode-generator";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase, supabaseReady } from "./supabase-browser";

// Accounts panel for business owners and the SOS Travellers team. Spanish only, like /equipo.
// What each role may do is enforced by the /api routes (api/owner.ts, api/admin.ts); this file only draws it.
type Role="tourist"|"owner"|"boss";
type Photo={path:string;status:"pending"|"published"|"rejected";url:string};
type Promotion={id:number;title:string;description?:string;validUntil:string;status:"pending"|"published"|"rejected";business?:string;partnerId?:number};
type Review={id:number;authorName:string;rating:number;comment:string;createdAt:string;status?:"published"|"hidden";placeId?:string};
type Business={id:number;kind:string;name:string;region:string;phone?:string;whatsapp?:string;url?:string;address?:string;languages:string[];status:"draft"|"published";ownerId?:string;placeId?:string;active:boolean;activeUntil?:string;photos:Photo[];reviewPlaceId:string;promotions?:Promotion[];reviews?:Review[]};
type Benefit={id:number;title:string;detail?:string|null;rank?:number;status?:"draft"|"published"};
type OwnerData={businesses:Business[];benefits:Benefit[]};
type Account={id:string;email:string;firstName:string;country:string;role:Role;createdAt:string};
type Application={id:number;businessName:string;contactName:string;email?:string;phone?:string;category:string;address:string;description:string;website?:string;interest:string;status:"pending"|"approved"|"rejected";createdAt:string};
type Suggestion={id:number;role:string;message:string;status:"new"|"read"|"done";created_at:string};
type AdminData={me:string;users:Account[];businesses:Business[];applications:Application[];reviews:Review[];suggestions:Suggestion[];promotions:Promotion[];benefits:Benefit[]};

const ZONE="America/Santiago",TEAM_KEY="sos-team-key",MAX_PHOTO_BYTES=5*1024*1024,MIN_PASSWORD=8;
const kindNames:Record<string,string>={radio_taxi:"Radio taxi",venue:"Local",tour:"Tour",other:"Otro"};
const roleNames:Record<Role,string>={tourist:"Viajero",owner:"Dueño de local",boss:"Boss"};
const statusNames:Record<string,string>={pending:"Pendiente",published:"Publicado",rejected:"Rechazado",draft:"En revisión",hidden:"Oculto",approved:"Aprobada",new:"Nueva",read:"Leída",done:"Resuelta"};
// Mirrors the region check in the SQL migrations and api/_regions.ts.
const regions=["AP","TA","AN","AT","CO","VS","RM","LI","ML","NB","BI","AR","LR","LL","AI","MA"];

const when=(iso:string)=>new Intl.DateTimeFormat("es-CL",{timeZone:ZONE,day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const day=(iso:string)=>new Intl.DateTimeFormat("es-CL",{timeZone:"UTC",day:"numeric",month:"short",year:"numeric"}).format(new Date(`${iso}T12:00:00Z`));
const isEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const field=(form:HTMLFormElement,name:string)=>String(new FormData(form).get(name)??"").trim();

async function api<T>(token:string,path:string,body?:Record<string,unknown>):Promise<T>{
  const response=await fetch(path,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"No pudimos completar la acción.");
  return data as T;
}
const message=(cause:unknown)=>cause instanceof Error&&cause.message?cause.message:"Algo salió mal. Intenta nuevamente.";

// Loads `path` on mount and again after every action; `run` wraps an action with the error and reload handling.
function useRemote<T>(token:string,path:string){
  const [data,setData]=useState<T|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let alive=true;
    api<T>(token,path).then((loaded)=>{if(alive){setData(loaded);setError("")}}).catch((cause)=>{if(alive)setError(message(cause))});
    return()=>{alive=false};
  },[token,path]);
  const run=useCallback(async(action:()=>Promise<unknown>)=>{
    setBusy(true);setError("");
    try{await action();setData(await api<T>(token,path))}
    catch(cause){setError(message(cause))}
    finally{setBusy(false)}
  },[token,path]);
  return{data,error,busy,run};
}

export default function Panel(){
  const [ready,setReady]=useState(false);
  const [session,setSession]=useState<Session|null>(null);
  const [profile,setProfile]=useState<{id:string;firstName:string;role:Role}|null>(null);
  const userId=session?.user.id;

  useEffect(()=>{
    document.title="Panel · SOS Travellers";
    const meta=document.createElement("meta");
    meta.name="robots";meta.content="noindex,nofollow";
    document.head.append(meta);
    let alive=true;
    void supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true)}});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return()=>{alive=false;meta.remove();listener.subscription.unsubscribe()};
  },[]);

  useEffect(()=>{
    if(!userId)return;
    let alive=true;
    void supabase.from("app_users").select("first_name, role").eq("id",userId).maybeSingle()
      .then(({data})=>{if(alive)setProfile({id:userId,firstName:data?.first_name??"",role:(data?.role??"tourist") as Role})});
    return()=>{alive=false};
  },[userId]);

  if(!supabaseReady)return <main className="team team-gate"><form><h1>Panel</h1><p className="team-error">Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_KEY.</p></form></main>;
  if(!ready)return null;
  if(!session)return <SignIn/>;
  const mine=profile?.id===userId?profile:null;
  const token=session.access_token;

  return <main className="team">
    <header className="team-top">
      <div><p className="team-eyebrow">SOS TRAVELLERS · PANEL</p><h1>{mine?`Hola, ${mine.firstName||"bienvenido"}`:"Cargando…"}</h1></div>
      <div className="team-actions">{mine&&<span className="team-pill ok">{roleNames[mine.role]}</span>}<button type="button" className="team-quiet" onClick={()=>void supabase.auth.signOut()}>Salir</button></div>
    </header>
    {mine?.role==="tourist"&&<section className="team-section"><article className="team-agent">
      <h3>Tu cuenta es de viajero</h3>
      <p className="team-summary">Este panel es para dueños de local. Si tienes un negocio, <a href="/#negocios">postula en el formulario de negocios</a> y te daremos acceso con este mismo correo: {session.user.email}</p>
    </article></section>}
    {mine?.role==="owner"&&<OwnerPanel token={token}/>}
    {mine?.role==="boss"&&<BossPanel token={token}/>}
    {mine&&<SuggestionBox token={token}/>}
  </main>;
}

function SignIn(){
  const [mode,setMode]=useState<"in"|"up"|"reset"|"code">("in");
  const [email,setEmail]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget,password=String(new FormData(form).get("password")??"");
    setError("");setNotice("");
    if(!isEmail(email.trim()))return setError("Escribe un correo válido.");
    if(mode!=="reset"&&password.length<(mode==="in"?1:MIN_PASSWORD))return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    setBusy(true);
    try{
      if(mode==="in"){
        const {error:failure}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(failure)setError(failure.status===400?"Correo o contraseña incorrectos.":"No pudimos iniciar sesión. Intenta nuevamente.");
      }else if(mode==="up"){
        const firstName=field(form,"firstName"),country=field(form,"country");
        if(firstName.length<2||country.length<2)return setError("Escribe tu nombre y tu país.");
        if(!new FormData(form).get("consent"))return setError("Debes aceptar para crear la cuenta.");
        // The profile row is created from this metadata by a database trigger (see the app_users migration).
        const {data,error:failure}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{first_name:firstName,country,preferred_language:"es",preferred_currency:"CLP"}}});
        if(failure)setError(failure.message||"No pudimos crear la cuenta.");
        else if(!data.session){setMode("in");setNotice("Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión.")}
      }else if(mode==="reset"){
        const {error:failure}=await supabase.auth.resetPasswordForEmail(email.trim());
        if(failure)setError("No pudimos enviar el código. Intenta nuevamente.");
        else{setMode("code");setNotice("Te enviamos un código a tu correo.")}
      }else{
        const verified=await supabase.auth.verifyOtp({email:email.trim(),token:field(form,"code"),type:"recovery"});
        const changed=verified.error?verified:await supabase.auth.updateUser({password});
        if(changed.error)setError(verified.error?"El código no es válido.":"No pudimos cambiar la contraseña.");
      }
    }finally{setBusy(false)}
  }

  const titles={in:"Iniciar sesión",up:"Crear cuenta",reset:"Recuperar contraseña",code:"Nueva contraseña"};
  const actions={in:"Entrar",up:"Crear cuenta",reset:"Enviar código",code:"Cambiar contraseña"};
  return <main className="team team-gate">
    <form onSubmit={submit} key={mode}>
      <p className="team-eyebrow">SOS TRAVELLERS · PANEL</p>
      <h1>{titles[mode]}</h1>
      {mode==="up"&&<><label htmlFor="panel-name">Nombre</label><input id="panel-name" name="firstName" autoComplete="given-name" maxLength={60}/>
        <label htmlFor="panel-country">País</label><input id="panel-country" name="country" autoComplete="country-name" maxLength={80}/></>}
      <label htmlFor="panel-email">Correo</label><input id="panel-email" type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} maxLength={160}/>
      {mode==="code"&&<><label htmlFor="panel-code">Código del correo</label><input id="panel-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={10}/></>}
      {mode!=="reset"&&<><label htmlFor="panel-password">{mode==="code"?"Nueva contraseña":"Contraseña"}</label><input id="panel-password" name="password" type="password" autoComplete={mode==="in"?"current-password":"new-password"}/></>}
      {mode==="up"&&<label className="panel-check"><input type="checkbox" name="consent"/> Acepto que SOS Travellers guarde mi nombre, correo y país para administrar mi cuenta.</label>}
      <button type="submit" disabled={busy}>{actions[mode]}</button>
      {error&&<p className="team-error" role="alert">{error}</p>}
      {notice&&<p className="panel-ok">{notice}</p>}
      <p className="panel-links">
        {mode!=="in"&&<button type="button" className="panel-link" onClick={()=>{setMode("in");setError("")}}>Ya tengo cuenta</button>}
        {mode==="in"&&<button type="button" className="panel-link" onClick={()=>{setMode("up");setError("")}}>Crear cuenta</button>}
        {mode==="in"&&<button type="button" className="panel-link" onClick={()=>{setMode("reset");setError("")}}>Olvidé mi contraseña</button>}
      </p>
    </form>
  </main>;
}

function SuggestionBox({token}:{token:string}){
  const [state,setState]=useState<"idle"|"sending"|"sent">("idle");
  const [error,setError]=useState("");
  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    setState("sending");setError("");
    try{await api(token,"/api/suggestions",{message:field(form,"message"),companyWebsite:field(form,"companyWebsite")});form.reset();setState("sent")}
    catch(cause){setError(message(cause));setState("idle")}
  }
  return <section className="team-section"><div className="team-section-head"><h2>Sugerencias</h2><p>Cuéntanos qué mejorarías. Lo lee el equipo de SOS Travellers.</p></div>
    <form className="team-agent panel-form" onSubmit={send}>
      <label className="wide">Tu sugerencia<textarea name="message" rows={3} minLength={5} maxLength={600} required/></label>
      <input className="panel-trap" name="companyWebsite" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
      <div className="team-actions wide"><button type="submit" disabled={state==="sending"}>Enviar</button>{state==="sent"&&<span className="panel-ok">¡Gracias! La recibimos.</span>}</div>
      {error&&<p className="team-error wide" role="alert">{error}</p>}
    </form>
  </section>;
}

function OwnerPanel({token}:{token:string}){
  const {data,error,busy,run}=useRemote<OwnerData>(token,"/api/owner");
  return <>
    {error&&<p className="team-error" role="alert">{error}</p>}
    {!data&&!error&&<p className="team-empty">Cargando…</p>}
    {data&&!data.businesses.length&&<section className="team-section"><article className="team-agent"><h3>Todavía no tienes un negocio asociado</h3><p className="team-summary">El equipo de SOS Travellers debe vincular tu local a esta cuenta. Si ya postulaste, te avisaremos cuando esté listo.</p></article></section>}
    {data?.businesses.map((business)=><BusinessCard key={business.id} business={business} token={token} busy={busy} run={run}/>)}
    {data&&data.benefits.length>0&&<section className="team-section"><div className="team-section-head"><h2>Beneficios SOS</h2><p>Lo que recibes por ser parte de SOS Travellers.</p></div>
      <ul className="team-drafts">{data.benefits.map((benefit)=><li key={benefit.id}><div><b>{benefit.title}</b>{benefit.detail&&<p>{benefit.detail}</p>}</div></li>)}</ul>
    </section>}
  </>;
}

function BusinessCard({business,token,busy,run}:{business:Business;token:string;busy:boolean;run:(action:()=>Promise<unknown>)=>Promise<void>}){
  const post=(body:Record<string,unknown>)=>api(token,"/api/owner",{partnerId:business.id,...body});
  const photo=(body:Record<string,unknown>)=>api<{path:string;token:string}>(token,"/api/owner-photos",{partnerId:business.id,...body});
  const reviewUrl=`${window.location.origin}/r/${business.id}`;
  const [qr]=useState(()=>{const code=qrcode(0,"M");code.addData(reviewUrl);code.make();return code.createDataURL(6,12)});
  const [fileError,setFileError]=useState("");

  function saveContact(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    void run(()=>post({action:"update-contact",phone:field(form,"phone"),whatsapp:field(form,"whatsapp"),url:field(form,"url"),address:field(form,"address"),languages:field(form,"languages").split(/[\s,]+/).filter(Boolean)}));
  }
  function addPromotion(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    void run(async()=>{await post({action:"add-promotion",title:field(form,"title"),description:field(form,"description"),validUntil:field(form,"validUntil")});form.reset()});
  }
  function upload(file:File|undefined){
    setFileError("");
    if(!file)return;
    if(file.size>MAX_PHOTO_BYTES)return setFileError("La foto puede pesar hasta 5 MB.");
    void run(async()=>{
      const ticket=await photo({action:"request",contentType:file.type});
      const {error}=await supabase.storage.from("business-photos").uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type});
      if(error)throw new Error("La foto no se pudo subir. Intenta nuevamente.");
      await photo({action:"confirm",path:ticket.path});
    });
  }

  return <section className="team-section" aria-labelledby={`business-${business.id}`}>
    <div className="team-section-head"><h2 id={`business-${business.id}`}>{business.name}</h2><p>{kindNames[business.kind]??business.kind} · {business.region} · {statusNames[business.status]}</p></div>
    <article className="team-agent">
      <div className="team-agent-head">
        <div><h3>{business.active?"Estás atendiendo":"No estás atendiendo"}</h3><p>{business.active&&business.activeUntil?`Los viajeros ven «Disponible ahora» hasta ${when(business.activeUntil)}. Se apaga solo.`:"Actívalo cuando abras: dura 12 horas o hasta que lo apagues."}</p></div>
        <span className={`team-pill ${business.active?"ok":"idle"}`}>{business.active?"Activo":"Inactivo"}</span>
      </div>
      <div className="team-actions panel-gap"><button type="button" disabled={busy} className={business.active?"team-quiet":""} onClick={()=>void run(()=>post({action:"set-active",active:!business.active}))}>{business.active?"Dejar de atender":"Estoy atendiendo"}</button></div>
      {business.status==="draft"&&<p className="team-empty panel-gap">Tu negocio aún no está publicado: el equipo lo está revisando.</p>}

      <h4>Información de contacto</h4>
      <form className="panel-form" onSubmit={saveContact} key={`${business.phone}|${business.whatsapp}|${business.url}|${business.address}|${business.languages.join()}`}>
        <label>Teléfono<input name="phone" defaultValue={business.phone??""} maxLength={30} autoComplete="tel"/></label>
        <label>WhatsApp<input name="whatsapp" defaultValue={business.whatsapp??""} maxLength={30}/></label>
        <label>Sitio o Instagram<input name="url" defaultValue={business.url??""} maxLength={300} placeholder="https://"/></label>
        <label>Idiomas de atención<input name="languages" defaultValue={business.languages.join(", ")} placeholder="ES, EN, PT"/></label>
        <label className="wide">Dirección<input name="address" defaultValue={business.address??""} maxLength={200}/></label>
        <div className="team-actions wide"><button type="submit" disabled={busy}>Guardar contacto</button></div>
      </form>

      <h4>Fotos del local ({business.photos.length} de 6)</h4>
      {!business.photos.length&&<p className="team-empty">Aún no subes fotos.</p>}
      <ul className="panel-photos">{business.photos.map((item)=><li key={item.path}>
        <img src={item.url} alt={`Foto de ${business.name}`} loading="lazy"/>
        <span className={`team-pill ${item.status==="published"?"ok":item.status==="rejected"?"error":"idle"}`}>{statusNames[item.status]}</span>
        <button type="button" className="team-quiet" disabled={busy} onClick={()=>void run(()=>photo({action:"remove",path:item.path}))}>Quitar</button>
      </li>)}</ul>
      {business.photos.length<6&&<label className="panel-file">Subir foto (JPG, PNG o WebP, hasta 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event)=>{upload(event.target.files?.[0]);event.target.value=""}}/></label>}
      {fileError&&<p className="team-error" role="alert">{fileError}</p>}
      <p className="team-empty">Cada foto se publica cuando el equipo la aprueba.</p>

      <h4>Promociones</h4>
      {!business.promotions?.length&&<p className="team-empty">No tienes promociones.</p>}
      <ul className="team-drafts">{business.promotions?.map((promotion)=><li key={promotion.id}>
        <div><small>{statusNames[promotion.status]} · hasta el {day(promotion.validUntil)}</small><b>{promotion.title}</b>{promotion.description&&<p>{promotion.description}</p>}</div>
        <div className="team-actions"><button type="button" className="team-quiet" disabled={busy} onClick={()=>void run(()=>post({action:"remove-promotion",promotionId:promotion.id}))}>Quitar</button></div>
      </li>)}</ul>
      <form className="panel-form" onSubmit={addPromotion}>
        <label>Título<input name="title" minLength={3} maxLength={80} required placeholder="2x1 en café hasta las 12:00"/></label>
        <label>Válida hasta<input name="validUntil" type="date" required/></label>
        <label className="wide">Detalle (opcional)<input name="description" maxLength={300}/></label>
        <div className="team-actions wide"><button type="submit" disabled={busy}>Agregar promoción</button><span className="team-empty">Se publica cuando el equipo la aprueba. Se canjea en tu local.</span></div>
      </form>

      <h4>Opiniones con NFC</h4>
      <div className="panel-nfc">
        <img src={qr} alt={`Código QR del enlace de opiniones de ${business.name}`} width={132} height={132}/>
        <div><p>Graba este enlace en tu etiqueta NFC o imprime el código QR. El viajero lo abre y deja su opinión.</p><code>{reviewUrl}</code>
          <div className="team-actions panel-gap"><button type="button" className="team-quiet" onClick={()=>void navigator.clipboard?.writeText(reviewUrl)}>Copiar enlace</button></div></div>
      </div>
      {business.status==="draft"&&<p className="team-empty">El enlace funciona cuando tu negocio esté publicado.</p>}
      <h4>Opiniones recibidas ({business.reviews?.length??0})</h4>
      {!business.reviews?.length&&<p className="team-empty">Todavía no recibes opiniones.</p>}
      <ul className="team-drafts">{business.reviews?.map((review)=><li key={review.id}><div><small>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} · {when(review.createdAt)}</small><b>{review.authorName}</b><p>{review.comment}</p></div></li>)}</ul>
    </article>
  </section>;
}

type BossTab="approvals"|"reviews"|"suggestions"|"businesses"|"applications"|"users"|"benefits";

function BossPanel({token}:{token:string}){
  const {data,error,busy,run}=useRemote<AdminData>(token,"/api/admin");
  const [tab,setTab]=useState<BossTab>("approvals");
  const act=(body:Record<string,unknown>)=>void run(()=>api(token,"/api/admin",body));
  if(!data)return error?<p className="team-error" role="alert">{error}</p>:<p className="team-empty">Cargando…</p>;

  const pendingPhotos=data.businesses.flatMap((business)=>business.photos.filter((item)=>item.status==="pending").map((item)=>({business,item})));
  const pendingPromotions=data.promotions.filter((promotion)=>promotion.status==="pending");
  const owners=data.users.filter((user)=>user.role!=="boss");
  const tabs:[BossTab,string,number][]=[
    ["approvals","Aprobaciones",pendingPhotos.length+pendingPromotions.length],
    ["reviews","Opiniones",data.reviews.length],
    ["suggestions","Sugerencias",data.suggestions.filter((item)=>item.status==="new").length],
    ["businesses","Negocios",data.businesses.length],
    ["applications","Solicitudes",data.applications.filter((item)=>item.status==="pending").length],
    ["users","Usuarios",data.users.length],
    ["benefits","Beneficios",data.benefits.length],
  ];
  // /equipo reads its key from sessionStorage and sends it as a bearer token; a boss session is accepted there too.
  const openAgents=()=>{try{sessionStorage.setItem(TEAM_KEY,token)}catch{} window.location.href="/equipo"};

  return <section className="team-section">
    <div className="team-tabs" role="tablist">
      {tabs.map(([id,name,count])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?"":"team-quiet"} onClick={()=>setTab(id)}>{name} ({count})</button>)}
      <button type="button" className="team-quiet" onClick={openAgents}>Agentes ↗</button>
    </div>
    {error&&<p className="team-error" role="alert">{error}</p>}

    {tab==="approvals"&&<article className="team-agent">
      <h3>Promociones pendientes</h3>
      {!pendingPromotions.length&&<p className="team-empty">Nada por aprobar.</p>}
      <ul className="team-drafts">{pendingPromotions.map((promotion)=><li key={promotion.id}>
        <div><small>{promotion.business} · hasta el {day(promotion.validUntil)}</small><b>{promotion.title}</b>{promotion.description&&<p>{promotion.description}</p>}</div>
        <div className="team-actions"><button type="button" disabled={busy} onClick={()=>act({action:"promotion-status",id:promotion.id,status:"published"})}>Aprobar</button><button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"promotion-status",id:promotion.id,status:"rejected"})}>Rechazar</button></div>
      </li>)}</ul>
      <h4>Fotos pendientes</h4>
      {!pendingPhotos.length&&<p className="team-empty">Nada por aprobar.</p>}
      <ul className="panel-photos">{pendingPhotos.map(({business,item})=><li key={item.path}>
        <img src={item.url} alt={`Foto enviada por ${business.name}`} loading="lazy"/><b>{business.name}</b>
        <button type="button" disabled={busy} onClick={()=>act({action:"photo-status",partnerId:business.id,path:item.path,status:"published"})}>Aprobar</button>
        <button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"photo-status",partnerId:business.id,path:item.path,status:"rejected"})}>Rechazar</button>
      </li>)}</ul>
    </article>}

    {tab==="reviews"&&<article className="team-agent"><h3>Opiniones de viajeros</h3>
      {!data.reviews.length&&<p className="team-empty">Todavía no hay opiniones.</p>}
      <ul className="team-drafts">{data.reviews.map((review)=><li key={review.id}>
        <div><small>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} · {review.placeId} · {when(review.createdAt)} · {statusNames[review.status??"published"]}</small><b>{review.authorName}</b><p>{review.comment}</p></div>
        <div className="team-actions"><button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"review-status",id:review.id,status:review.status==="hidden"?"published":"hidden"})}>{review.status==="hidden"?"Volver a publicar":"Ocultar"}</button></div>
      </li>)}</ul>
    </article>}

    {tab==="suggestions"&&<article className="team-agent"><h3>Sugerencias</h3>
      {!data.suggestions.length&&<p className="team-empty">Todavía no hay sugerencias.</p>}
      <ul className="team-drafts">{data.suggestions.map((item)=><li key={item.id}>
        <div><small>{roleNames[item.role as Role]??"Sin cuenta"} · {when(item.created_at)} · {statusNames[item.status]}</small><p>{item.message}</p></div>
        <div className="team-actions">{item.status!=="read"&&<button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"suggestion-status",id:item.id,status:"read"})}>Leída</button>}{item.status!=="done"&&<button type="button" disabled={busy} onClick={()=>act({action:"suggestion-status",id:item.id,status:"done"})}>Resuelta</button>}</div>
      </li>)}</ul>
    </article>}

    {tab==="businesses"&&<article className="team-agent"><h3>Negocios</h3>
      <form className="panel-form" onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;void run(async()=>{await api(token,"/api/admin",{action:"create-business",name:field(form,"name"),kind:field(form,"kind"),region:field(form,"region")});form.reset()})}}>
        <label>Nombre<input name="name" minLength={2} maxLength={100} required/></label>
        <label>Tipo<select name="kind" defaultValue="venue">{Object.entries(kindNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <label>Región<select name="region" defaultValue="RM">{regions.map((region)=><option key={region}>{region}</option>)}</select></label>
        <div className="team-actions"><button type="submit" disabled={busy}>Crear negocio</button></div>
      </form>
      {!data.businesses.length&&<p className="team-empty">Aún no hay negocios.</p>}
      <ul className="team-drafts">{data.businesses.map((business)=><li key={business.id} className="panel-stack">
        <div><small>{kindNames[business.kind]??business.kind} · {business.region} · {statusNames[business.status]}{business.active?" · atendiendo ahora":""}</small><b>{business.name}</b></div>
        <form className="panel-form" key={`${business.ownerId}|${business.placeId}`} onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;act({action:"update-business",partnerId:business.id,ownerId:field(form,"ownerId"),placeId:field(form,"placeId")})}}>
          <label>Dueño<select name="ownerId" defaultValue={business.ownerId??""}><option value="">Sin dueño</option>{owners.map((user)=><option key={user.id} value={user.id}>{user.firstName} · {user.email}</option>)}</select></label>
          <label>Id de su ficha en el mapa<input name="placeId" defaultValue={business.placeId??""} maxLength={64} placeholder="opcional"/></label>
          <div className="team-actions wide">
            <button type="submit" className="team-quiet" disabled={busy}>Guardar vínculo</button>
            <button type="button" disabled={busy} onClick={()=>act({action:"update-business",partnerId:business.id,status:business.status==="published"?"draft":"published"})}>{business.status==="published"?"Despublicar":"Publicar"}</button>
            {business.active&&<button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"update-business",partnerId:business.id,deactivate:true})}>Apagar «atendiendo»</button>}
          </div>
        </form>
      </li>)}</ul>
    </article>}

    {tab==="applications"&&<article className="team-agent"><h3>Solicitudes de negocios</h3>
      {!data.applications.length&&<p className="team-empty">Todavía no hay solicitudes.</p>}
      <ul className="team-drafts">{data.applications.map((item)=><li key={item.id}>
        <div><small>{item.category} · {when(item.createdAt)} · {statusNames[item.status]}</small><b>{item.businessName}</b><span>{item.contactName}{item.email?` · ${item.email}`:""}{item.phone?` · ${item.phone}`:""}</span><p>{item.description}</p><span>{item.address}</span></div>
        {item.status==="pending"&&<div className="team-actions">
          <button type="button" disabled={busy} onClick={()=>act({action:"create-business",applicationId:item.id,name:item.businessName,kind:"venue",region:"RM",phone:item.phone,url:item.website,address:item.address})}>Crear negocio</button>
          <button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"application-status",id:item.id,status:"rejected"})}>Rechazar</button>
        </div>}
      </li>)}</ul>
    </article>}

    {tab==="users"&&<article className="team-agent"><h3>Usuarios</h3>
      <ul className="team-drafts">{data.users.map((user)=><li key={user.id}>
        <div><small>{user.country} · desde el {when(user.createdAt)}</small><b>{user.firstName}</b><span>{user.email}</span></div>
        <div className="team-actions">{user.id===data.me?<span className="team-pill ok">Tú · Boss</span>
          :<select aria-label={`Rol de ${user.firstName}`} value={user.role} disabled={busy} onChange={(event)=>act({action:"set-role",userId:user.id,role:event.target.value})}>{(Object.keys(roleNames) as Role[]).map((role)=><option key={role} value={role}>{roleNames[role]}</option>)}</select>}</div>
      </li>)}</ul>
    </article>}

    {tab==="benefits"&&<article className="team-agent"><h3>Beneficios para dueños</h3>
      <form className="panel-form" onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;void run(async()=>{await api(token,"/api/admin",{action:"save-benefit",title:field(form,"title"),detail:field(form,"detail")});form.reset()})}}>
        <label>Beneficio<input name="title" minLength={3} maxLength={80} required/></label>
        <label>Detalle (opcional)<input name="detail" maxLength={300}/></label>
        <div className="team-actions wide"><button type="submit" disabled={busy}>Agregar beneficio</button></div>
      </form>
      {!data.benefits.length&&<p className="team-empty">Aún no defines beneficios. Los dueños los ven en su panel.</p>}
      <ul className="team-drafts">{data.benefits.map((benefit)=><li key={benefit.id}>
        <div><b>{benefit.title}</b>{benefit.detail&&<p>{benefit.detail}</p>}</div>
        <div className="team-actions"><button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"remove-benefit",id:benefit.id})}>Quitar</button></div>
      </li>)}</ul>
    </article>}
  </section>;
}
