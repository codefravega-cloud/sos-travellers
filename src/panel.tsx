import type { Session } from "@supabase/supabase-js";
import qrcode from "qrcode-generator";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase-browser";
import TravellerHome, { type Promotion as TravellerPromotion } from "./traveller-home";
import { categoryNames, priceLabel, serviceCategories, type Service } from "./services-board";
import type { RegionId } from "./chile-regions";

// Accounts panel for business owners and the SOS Travellers team. Spanish only, like /equipo.
// What each role may do is enforced by the /api routes (api/_routes/owner.ts, api/_routes/admin.ts); this file only draws it.
type Role="tourist"|"owner"|"boss";
type Photo={path:string;status:"pending"|"published"|"rejected";url:string};
type Promotion={id:number;title:string;description?:string;validUntil:string;status:"pending"|"published"|"rejected";business?:string;partnerId?:number};
type Review={id:number;authorName:string;rating:number;comment:string;createdAt:string;status?:"published"|"hidden";placeId?:string};
// A service as its business and the admin see it (api/_routes/_services.ts toManagedService).
export type ManagedService=Omit<Service,"photos"|"business">&{partnerId:number;status:"pending"|"published"|"rejected";reviewNote?:string;photos:{path:string;url:string}[];updatedAt:string;business?:string};
type Business={id:number;kind:string;name:string;region:string;phone?:string;whatsapp?:string;url?:string;address?:string;languages:string[];status:"draft"|"published";ownerId?:string;placeId?:string;active:boolean;activeUntil?:string;photos:Photo[];reviewPlaceId:string;promotions?:Promotion[];reviews?:Review[];services?:ManagedService[]};
type Approval="pendiente"|"aprobada"|"rechazada";
type Benefit={id:number;title:string;detail?:string|null;rank?:number;status?:"draft"|"published"};
export type OwnerData={businesses:Business[];benefits:Benefit[];account?:{approval:Approval;reason?:string}};
// Account types, levels and states mirror tbl_usuarios and tbl_niveles (202610220001_tbl_usuarios.sql).
type AccountType="cliente"|"empresa"|"admin";
type AccountState="activo"|"bloqueado"|"inactivo";
type LevelCode="basico"|"medio"|"alto"|"premium";
type Account={id:string;email:string;firstName:string;country:string;type:AccountType;approval:Approval;approvalReason?:string;level:LevelCode;levelUntil?:string;state:AccountState;stateReason?:string;stateAt?:string;rut?:string;createdAt:string};
type Level={code:LevelCode;name:string;order:number;clientBenefits:string[];businessBenefits:string[];monthlyPrice:number|null};
type AuditEntry={id:number;actorId?:string;origin:"base"|"admin";action:string;table:string;recordId?:string;before?:Record<string,unknown>;after?:Record<string,unknown>;reason?:string;createdAt:string};
export type PlaceRow={id:string;name:string;category:string;region:string;locality:string;address?:string|null;rating?:number|null;source:string;status:"published"|"hidden"};
type Application={id:number;businessName:string;contactName:string;email?:string;phone?:string;category:string;address:string;description:string;website?:string;interest:string;status:"pending"|"approved"|"rejected";createdAt:string};
type Suggestion={id:number;role:string;message:string;status:"new"|"read"|"done";created_at:string};
export type AdminData={me:string;users:Account[];levels:Level[];audit:AuditEntry[];services:ManagedService[];businesses:Business[];applications:Application[];reviews:Review[];suggestions:Suggestion[];promotions:Promotion[];benefits:Benefit[]};

const ZONE="America/Santiago",TEAM_KEY="sos-team-key",MAX_PHOTO_BYTES=5*1024*1024,MIN_PASSWORD=8;
const kindNames:Record<string,string>={radio_taxi:"Radio taxi",venue:"Local",tour:"Tour",other:"Otro"};
const roleNames:Record<Role,string>={tourist:"Cliente",owner:"Empresa",boss:"Admin"};
const roleOf:Record<AccountType,Role>={cliente:"tourist",empresa:"owner",admin:"boss"};
const typeNames:Record<AccountType,string>={cliente:"Cliente",empresa:"Empresa",admin:"Admin"};
const stateNames:Record<AccountState,string>={activo:"Activa",bloqueado:"Bloqueada",inactivo:"Desactivada"};
const statusNames:Record<string,string>={pending:"Pendiente",published:"Publicado",rejected:"Rechazado",draft:"En revisión",hidden:"Oculto",approved:"Aprobada",new:"Nueva",read:"Leída",done:"Resuelta"};
// Mirrors the region check in the SQL migrations and api/_routes/_regions.ts.
const regions=["AP","TA","AN","AT","CO","VS","RM","LI","ML","NB","BI","AR","LR","LL","AI","MA"];

const when=(iso:string)=>new Intl.DateTimeFormat("es-CL",{timeZone:ZONE,day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const day=(iso:string)=>new Intl.DateTimeFormat("es-CL",{timeZone:"UTC",day:"numeric",month:"short",year:"numeric"}).format(new Date(`${iso}T12:00:00Z`));
const isEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const field=(form:HTMLFormElement,name:string)=>String(new FormData(form).get(name)??"").trim();

async function api<T>(token:string,path:string,body?:Record<string,unknown>):Promise<T>{
  if(demo)return (await import("./panel-demo")).demoApi(token,path,body) as Promise<T>;
  const response=await fetch(path,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"No pudimos completar la acción.");
  return data as T;
}
// /panel?demo=owner (or boss, tourist) draws that role's panel with the sample data in panel-demo.ts, to show the panel
// to people without an account. It never reads or writes real data, and panel-demo.ts is only downloaded on those addresses.
const demoPeople:Record<Role,{firstName:string;country:string}>={tourist:{firstName:"Emma",country:"Francia"},owner:{firstName:"Carolina",country:"Chile"},boss:{firstName:"Equipo",country:"Chile"}};
const demoAccount=(role:string|null)=>role&&role in demoPeople?{id:`demo-${role}`,...demoPeople[role as Role],role:role as Role,state:"activo" as AccountState,stateReason:""}:null;
const demoPromotions=async(region:RegionId):Promise<TravellerPromotion[]>=>(await import("./panel-demo")).demoPromotions(region);
const demoServices=async(region:RegionId):Promise<Service[]>=>(await import("./panel-demo")).demoServices(region);
const demo=demoAccount(new URLSearchParams(window.location.search).get("demo"));
// Each demo asks for its own password, shared with the team in a PDF. Only SHA-256 hashes live here because this
// repository is public. The demo holds sample data only, so this keeps casual visitors out; it does not protect data.
const demoHashes:Record<Role,string>={
  owner:"7405473f926015cccc774c0d989a1fe407e178cf1e2a2202a0aca39c1063ef0e",
  boss:"a49140f5130614a8e8db81c6f1ceb38f14aa1880259cd641e7fe9919c7a72001",
  tourist:"eddfae6f04d5f120f6fd416c88d2a7959f75ea73dfeccd6d0e48796fbc8077ec",
};
const DEMO_KEY="sos-demo-open";
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))),(byte)=>byte.toString(16).padStart(2,"0")).join("");
const demoOpen=(role:Role)=>{try{return sessionStorage.getItem(`${DEMO_KEY}-${role}`)==="1"}catch{return false}};

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
  const [profile,setProfile]=useState<{id:string;firstName:string;country:string;role:Role;state:AccountState;stateReason:string}|null>(null);
  const [demoReady,setDemoReady]=useState(()=>demo?demoOpen(demo.role):false);
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
    // Each user reads only their own row (RLS); the API checks type and state again on every request.
    void supabase.from("tbl_usuarios").select("nombre, pais, tipo_cuenta, estado, estado_motivo").eq("id",userId).maybeSingle()
      .then(({data})=>{if(alive)setProfile({id:userId,firstName:data?.nombre??"",country:data?.pais??"",role:roleOf[data?.tipo_cuenta as AccountType]??"tourist",state:(data?.estado??"activo") as AccountState,stateReason:data?.estado_motivo??""})});
    return()=>{alive=false};
  },[userId]);

  const account=demo?{token:demo.id,email:`${demo.firstName.toLowerCase()}@example.com`}:session&&{token:session.access_token,email:session.user.email,trial:Boolean(session.user.is_anonymous)};
  if(demo&&!demoReady)return <DemoGate role={demo.role} onOpen={()=>setDemoReady(true)}/>;
  if(!ready&&!demo)return null;
  if(!account)return <SignIn/>;
  const mine=demo??(profile?.id===userId?profile:null);
  const token=account.token;
  const signOut=()=>demo?window.location.assign("/panel"):void supabase.auth.signOut();
  const demoBanner=demo&&<p className="panel-ok" style={{marginBottom:16}}>Modo demo: datos de ejemplo, nada se guarda y todo vuelve a empezar al recargar. Ver como <a href="?demo=owner">empresa</a> · <a href="?demo=boss">admin</a> · <a href="?demo=tourist">cliente</a></p>;
  const trialNote="trial" in account&&account.trial&&<p className="team-empty" style={{marginBottom:16}}>Cuenta de prueba, sin correo ni contraseña: queda guardada en este navegador. Si sales, tendrás que crear otra.</p>;

  // A blocked or deactivated account sees why, and can still write to the team.
  if(mine&&mine.state!=="activo")return <main className="team">
    <header className="team-top">
      <div><p className="team-eyebrow">SOS TRAVELLERS · PANEL</p><h1>Tu cuenta está {mine.state==="bloqueado"?"bloqueada":"desactivada"}</h1></div>
      <div className="team-actions"><button type="button" className="team-quiet" onClick={signOut}>Salir</button></div>
    </header>
    <section className="team-section"><article className="team-agent"><h3>Motivo</h3><p className="team-summary">{mine.stateReason}</p>
      <p className="team-empty panel-gap">Si crees que es un error, escríbenos aquí abajo.</p></article></section>
    <SuggestionBox token={token}/>
  </main>;

  // A traveller gets a personal version of the landing instead of the business tools.
  if(mine?.role==="tourist")return <TravellerHome name={mine.firstName||"viajero"} country={mine.country} onSignOut={signOut}
    banner={(demoBanner||trialNote)&&<div className="th-notes">{demoBanner}{trialNote}</div>}
    footer={<div className="team th-suggest"><SuggestionBox token={token}/></div>}
    loadPromotions={demo?demoPromotions:undefined} loadServices={demo?demoServices:undefined}/>;

  return <main className="team">
    <header className="team-top">
      <div><p className="team-eyebrow">SOS TRAVELLERS · PANEL</p><h1>{mine?`Hola, ${mine.firstName||"bienvenido"}`:"Cargando…"}</h1></div>
      <div className="team-actions">{mine&&<span className="team-pill ok">{roleNames[mine.role]}</span>}<button type="button" className="team-quiet" onClick={signOut}>Salir</button></div>
    </header>
    {demoBanner}
    {trialNote}
    {mine?.role==="owner"&&<OwnerPanel token={token}/>}
    {mine?.role==="boss"&&<BossPanel token={token}/>}
    {mine&&<SuggestionBox token={token}/>}
  </main>;
}

function DemoGate({role,onOpen}:{role:Role;onOpen:()=>void}){
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    // Lowercase, so a phone that capitalises the first letter still matches.
    const password=String(new FormData(event.currentTarget).get("password")??"").trim().toLowerCase();
    if(await sha256(password)!==demoHashes[role])return setError("Contraseña incorrecta.");
    try{sessionStorage.setItem(`${DEMO_KEY}-${role}`,"1")}catch{}
    onOpen();
  }
  return <main className="team team-gate">
    <form onSubmit={submit}>
      <p className="team-eyebrow">SOS TRAVELLERS · DEMO</p>
      <h1>Demo: {roleNames[role]}</h1>
      <label htmlFor="demo-password">Contraseña de la demo</label><input id="demo-password" name="password" type="password" autoComplete="off" autoCapitalize="none" autoFocus/>
      <button type="submit">Entrar a la demo</button>
      {error&&<p className="team-error" role="alert">{error}</p>}
      <p className="team-empty">La contraseña está en el documento que compartió el equipo de SOS Travellers.</p>
    </form>
  </main>;
}

// A traveller account is created with a name and a country only, as a Supabase anonymous user that lives in this
// browser. A business account needs email and password, since it comes back to manage its services; it starts
// pending until the admin approves it (202610260003_services.sql). Accounts with a password sign in with "in".
function SignIn(){
  const [mode,setMode]=useState<"in"|"up"|"reset"|"code">("up");
  const [kind,setKind]=useState<"viajero"|"empresa">("viajero");
  const [email,setEmail]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget,password=String(new FormData(form).get("password")??"");
    setError("");setNotice("");
    if(mode==="up"){
      const firstName=field(form,"firstName"),country=field(form,"country");
      if(firstName.length<2||country.length<2)return setError("Escribe tu nombre y tu país.");
      if(!new FormData(form).get("consent"))return setError("Debes aceptar para crear la cuenta.");
      if(kind==="empresa"){
        const businessName=field(form,"businessName");
        if(businessName.length<2)return setError("Escribe el nombre de tu empresa.");
        if(!isEmail(email.trim()))return setError("Escribe un correo válido.");
        if(password.length<MIN_PASSWORD)return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
        setBusy(true);
        try{
          const {data,error:failure}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{first_name:firstName,country,preferred_language:"es",preferred_currency:"CLP",tipo_cuenta:"empresa",business_name:businessName,business_kind:field(form,"businessKind"),business_region:field(form,"businessRegion")}}});
          if(failure)setError(failure.status===422?"Ese correo ya tiene una cuenta. Usa «Entrar con correo y contraseña».":"No pudimos crear la cuenta. Intenta nuevamente.");
          // With email confirmation on there is no session until the link in the email is opened.
          else if(!data.session){setMode("in");setNotice("Te enviamos un correo para confirmar tu cuenta. Después entra con tu correo y contraseña.")}
        }finally{setBusy(false)}
        return;
      }
      setBusy(true);
      try{
        // The profile row is created from this metadata by a database trigger (see the app_users migration).
        const {error:failure}=await supabase.auth.signInAnonymously({options:{data:{first_name:firstName,country,preferred_language:"es",preferred_currency:"CLP"}}});
        if(failure)setError(failure.code==="anonymous_provider_disabled"?"La creación de cuentas todavía no está activada. Intenta más tarde.":"No pudimos crear la cuenta. Intenta nuevamente.");
      }finally{setBusy(false)}
      return;
    }
    if(!isEmail(email.trim()))return setError("Escribe un correo válido.");
    if(mode!=="reset"&&password.length<(mode==="in"?1:MIN_PASSWORD))return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    setBusy(true);
    try{
      if(mode==="in"){
        const {error:failure}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(failure)setError(failure.status===400?"Correo o contraseña incorrectos.":"No pudimos iniciar sesión. Intenta nuevamente.");
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
  const actions={in:"Entrar",up:"Crear cuenta y entrar",reset:"Enviar código",code:"Cambiar contraseña"};
  return <main className="team team-gate">
    <form onSubmit={submit} key={mode}>
      <p className="team-eyebrow">SOS TRAVELLERS · PANEL</p>
      <h1>{titles[mode]}</h1>
      {mode==="up"&&<div className="panel-kind" role="radiogroup" aria-label="Tipo de cuenta">
        <button type="button" role="radio" aria-checked={kind==="viajero"} className={kind==="viajero"?"":"team-quiet"} onClick={()=>setKind("viajero")}>Soy viajero</button>
        <button type="button" role="radio" aria-checked={kind==="empresa"} className={kind==="empresa"?"":"team-quiet"} onClick={()=>setKind("empresa")}>Ofrezco servicios</button>
      </div>}
      {mode==="up"&&<><label htmlFor="panel-name">{kind==="empresa"?"Tu nombre":"Nombre"}</label><input id="panel-name" name="firstName" autoComplete="given-name" maxLength={60}/>
        <label htmlFor="panel-country">País</label><input id="panel-country" name="country" autoComplete="country-name" maxLength={80}/></>}
      {mode==="up"&&kind==="empresa"&&<>
        <label htmlFor="panel-business">Nombre de la empresa</label><input id="panel-business" name="businessName" autoComplete="organization" maxLength={100}/>
        <label htmlFor="panel-business-kind">Rubro</label><select id="panel-business-kind" name="businessKind" defaultValue="tour">{Object.entries(kindNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>
        <label htmlFor="panel-business-region">Región</label><select id="panel-business-region" name="businessRegion" defaultValue="RM">{regions.map((region)=><option key={region}>{region}</option>)}</select>
      </>}
      {(mode!=="up"||kind==="empresa")&&<><label htmlFor="panel-email">Correo</label><input id="panel-email" type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} maxLength={160}/></>}
      {mode==="code"&&<><label htmlFor="panel-code">Código del correo</label><input id="panel-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={10}/></>}
      {(mode==="in"||mode==="code"||(mode==="up"&&kind==="empresa"))&&<><label htmlFor="panel-password">{mode==="code"?"Nueva contraseña":"Contraseña"}</label><input id="panel-password" name="password" type="password" autoComplete={mode==="in"?"current-password":"new-password"}/></>}
      {mode==="up"&&<label className="panel-check"><input type="checkbox" name="consent"/> {kind==="empresa"?"Acepto que SOS Travellers guarde mis datos y los de mi empresa para administrar la cuenta y publicar mis servicios.":"Acepto que SOS Travellers guarde mi nombre y mi país para administrar mi cuenta."}</label>}
      {mode==="up"&&<p className="team-empty">{kind==="empresa"?"Tu empresa queda en revisión hasta que el equipo de SOS Travellers la apruebe. Mientras tanto puedes preparar tus servicios.":"Sin correo ni contraseña: tu cuenta queda guardada en este navegador."}</p>}
      <button type="submit" disabled={busy}>{actions[mode]}</button>
      {error&&<p className="team-error" role="alert">{error}</p>}
      {notice&&<p className="panel-ok">{notice}</p>}
      <p className="panel-links">
        {mode!=="in"&&<button type="button" className="panel-link" onClick={()=>{setMode("in");setError("")}}>{mode==="up"?"Entrar con correo y contraseña":"Ya tengo cuenta"}</button>}
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
    {data?.account?.approval==="pendiente"&&<p className="panel-ok" style={{marginBottom:16}}>Tu empresa está en revisión. Puedes preparar tus servicios: se publicarán cuando el equipo de SOS Travellers apruebe tu empresa y cada servicio.</p>}
    {data?.account?.approval==="rechazada"&&<p className="team-error" role="alert">Tu solicitud como empresa fue rechazada{data.account.reason?`: ${data.account.reason}`:"."} Si crees que es un error, escríbenos en Sugerencias.</p>}
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

      <ServicesBlock business={business} token={token} busy={busy} run={run}/>

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

// The services of one business, as its owner manages them. Saving a service or adding a photo sends it back to the
// admin for approval (api/_routes/owner.ts, save-service).
function ServicesBlock({business,token,busy,run}:{business:Business;token:string;busy:boolean;run:(action:()=>Promise<unknown>)=>Promise<void>}){
  const services=business.services??[];
  const post=(body:Record<string,unknown>)=>api(token,"/api/owner",{partnerId:business.id,...body});
  const photo=(body:Record<string,unknown>)=>api<{path:string;token:string}>(token,"/api/owner-photos",{partnerId:business.id,...body});
  const [fileError,setFileError]=useState("");
  function upload(serviceId:number,file:File|undefined){
    setFileError("");
    if(!file)return;
    if(file.size>MAX_PHOTO_BYTES)return setFileError("La foto puede pesar hasta 5 MB.");
    void run(async()=>{
      const ticket=await photo({action:"request",serviceId,contentType:file.type});
      const {error}=await supabase.storage.from("business-photos").uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type});
      if(error)throw new Error("La foto no se pudo subir. Intenta nuevamente.");
      await photo({action:"confirm",serviceId,path:ticket.path});
    });
  }
  return <>
    <h4>Servicios que ofreces ({services.length} de 10)</h4>
    <p className="team-empty">Los viajeros los ven en su región. Cada servicio nuevo o editado lo revisa el equipo antes de publicarse.</p>
    {!services.length&&<p className="team-empty">Todavía no agregas servicios.</p>}
    <ul className="team-drafts">{services.map((service)=><li key={service.id} className="panel-stack">
      <div><small>{categoryNames.es[service.category]} · {statusNames[service.status]} · {priceLabel(service,"es")}{service.duration?` · ${service.duration}`:""}</small><b>{service.title}</b><p>{service.description}</p>
        {service.status==="rejected"&&service.reviewNote&&<p className="panel-reason-note">Motivo del equipo: {service.reviewNote}</p>}</div>
      <details className="panel-details"><summary>Editar, fotos o quitar</summary>
        <ServiceForm service={service} busy={busy} onSave={(fields)=>void run(()=>post({action:"save-service",serviceId:service.id,...fields}))}/>
        <ul className="panel-photos">{service.photos.map((item)=><li key={item.path}>
          <img src={item.url} alt={`Foto de ${service.title}`} loading="lazy"/>
          <button type="button" className="team-quiet" disabled={busy} onClick={()=>void run(()=>photo({action:"remove",serviceId:service.id,path:item.path}))}>Quitar</button>
        </li>)}</ul>
        {service.photos.length<3&&<label className="panel-file">Subir foto del servicio ({service.photos.length} de 3; JPG, PNG o WebP, hasta 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event)=>{upload(service.id,event.target.files?.[0]);event.target.value=""}}/></label>}
        {fileError&&<p className="team-error" role="alert">{fileError}</p>}
        <div className="team-actions"><button type="button" className="team-quiet" disabled={busy} onClick={()=>void run(()=>post({action:"remove-service",serviceId:service.id}))}>Quitar servicio</button></div>
      </details>
    </li>)}</ul>
    {services.length<10&&<details className="panel-details panel-gap"><summary>Agregar un servicio</summary>
      <ServiceForm busy={busy} onSave={(fields)=>void run(()=>post({action:"save-service",...fields}))}/>
      <p className="team-empty">Las fotos se agregan después de guardar el servicio.</p>
    </details>}
  </>;
}

function ServiceForm({service,busy,onSave}:{service?:ManagedService;busy:boolean;onSave:(fields:Record<string,unknown>)=>void}){
  return <form className="panel-form" key={service?.updatedAt??"new"} onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;
    onSave({category:field(form,"category"),title:field(form,"title"),description:field(form,"description"),priceClp:field(form,"priceClp"),priceFrom:new FormData(form).get("priceFrom")==="on",
      duration:field(form,"duration"),languages:field(form,"languages").split(/[\s,]+/).filter(Boolean),whatsapp:field(form,"whatsapp"),phone:field(form,"phone"),bookingUrl:field(form,"bookingUrl")});
    if(!service)form.reset()}}>
    <label>Tipo<select name="category" defaultValue={service?.category??"tour"}>{serviceCategories.map((id)=><option key={id} value={id}>{categoryNames.es[id]}</option>)}</select></label>
    <label>Nombre del servicio<input name="title" defaultValue={service?.title} minLength={3} maxLength={80} required placeholder="Tour por Valparaíso"/></label>
    <label className="wide">Descripción<textarea name="description" defaultValue={service?.description} rows={3} minLength={10} maxLength={600} required placeholder="Qué incluye, punto de encuentro, para quién es."/></label>
    <label>Precio en pesos (vacío = a convenir)<input name="priceClp" inputMode="numeric" defaultValue={service?.priceClp??""} placeholder="25000"/></label>
    <label className="panel-check"><input type="checkbox" name="priceFrom" defaultChecked={service?.priceFrom}/> Es un precio «desde»</label>
    <label>Duración<input name="duration" defaultValue={service?.duration} maxLength={40} placeholder="3 horas"/></label>
    <label>Idiomas<input name="languages" defaultValue={service?.languages.join(", ")} placeholder="ES, EN, PT"/></label>
    <label>WhatsApp<input name="whatsapp" defaultValue={service?.whatsapp} maxLength={30} placeholder="+56 9 1234 5678"/></label>
    <label>Teléfono<input name="phone" defaultValue={service?.phone} maxLength={30} autoComplete="tel"/></label>
    <label className="wide">Enlace para reservar (opcional)<input name="bookingUrl" defaultValue={service?.bookingUrl} maxLength={300} placeholder="https://"/></label>
    <div className="team-actions wide"><button type="submit" disabled={busy}>{service?"Guardar y enviar a revisión":"Agregar y enviar a revisión"}</button></div>
  </form>;
}

type BossTab="approvals"|"services"|"reviews"|"suggestions"|"businesses"|"applications"|"users"|"levels"|"places"|"benefits"|"audit";
type Act=(body:Record<string,unknown>)=>void;

const levelCodes:LevelCode[]=["basico","medio","alto","premium"];
const actionNames:Record<string,string>={crear:"Creó",editar:"Editó",borrar:"Eliminó",cambiar_tipo:"Cambió el tipo de cuenta",cambiar_nivel:"Cambió el nivel",bloquear:"Bloqueó la cuenta",desactivar:"Desactivó la cuenta",reactivar:"Reactivó la cuenta",editar_perfil:"Editó el perfil",cargar_rut:"Cargó el RUT",quitar_rut:"Quitó el RUT",eliminar_cuenta:"Eliminó la cuenta",editar_nivel:"Editó un nivel",ocultar_lugar:"Ocultó un lugar",publicar_lugar:"Publicó un lugar"};
const tableNames:Record<string,string>={tbl_usuarios:"Usuarios",tbl_usuarios_privado:"Datos privados",tbl_niveles:"Niveles",partners:"Negocios",promotions:"Promociones",events:"Eventos",reviews:"Opiniones",suggestions:"Sugerencias",business_applications:"Solicitudes",places:"Lugares"};
const isoDay=(iso:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:ZONE}).format(new Date(iso));

// An action that needs a reason (block, delete…): the first click opens a field, the second one confirms.
function ReasonAction({label,confirm,placeholder,busy,danger,onConfirm}:{label:string;confirm:string;placeholder:string;busy:boolean;danger?:boolean;onConfirm:(reason:string)=>void}){
  const [open,setOpen]=useState(false);
  if(!open)return <button type="button" className="team-quiet" disabled={busy} onClick={()=>setOpen(true)}>{label}</button>;
  return <form className="panel-reason" onSubmit={(event)=>{event.preventDefault();onConfirm(field(event.currentTarget,"reason"));setOpen(false)}}>
    <input name="reason" minLength={5} maxLength={500} required placeholder={placeholder} aria-label={placeholder} autoFocus/>
    <button type="submit" className={danger?"panel-danger":""} disabled={busy}>{confirm}</button>
    <button type="button" className="team-quiet" onClick={()=>setOpen(false)}>Cancelar</button>
  </form>;
}

// Deleting is for good; the reason stays in the history.
function DeleteAction({what,busy,onConfirm}:{what:string;busy:boolean;onConfirm:(reason:string)=>void}){
  return <ReasonAction label="Eliminar" confirm={`Eliminar ${what} para siempre`} placeholder="Motivo (queda en el historial)" busy={busy} danger onConfirm={onConfirm}/>;
}

function BossPanel({token}:{token:string}){
  const {data,error,busy,run}=useRemote<AdminData>(token,"/api/admin");
  const [tab,setTab]=useState<BossTab>("approvals");
  const act:Act=(body)=>void run(()=>api(token,"/api/admin",body));
  if(!data)return error?<p className="team-error" role="alert">{error}</p>:<p className="team-empty">Cargando…</p>;

  const remove=(kind:string,id:number)=>(reason:string)=>act({action:"delete",kind,id,reason});
  const pendingPhotos=data.businesses.flatMap((business)=>business.photos.filter((item)=>item.status==="pending").map((item)=>({business,item})));
  const pendingPromotions=data.promotions.filter((promotion)=>promotion.status==="pending");
  const pendingCompanies=data.users.filter((user)=>user.type==="empresa"&&user.approval==="pendiente");
  const pendingServices=data.services.filter((service)=>service.status==="pending");
  const owners=data.users.filter((user)=>user.type!=="admin");
  const tabs:[BossTab,string,number|null][]=[
    ["approvals","Aprobaciones",pendingPhotos.length+pendingPromotions.length+pendingCompanies.length+pendingServices.length],
    ["services","Servicios",data.services.length],
    ["reviews","Opiniones",data.reviews.length],
    ["suggestions","Sugerencias",data.suggestions.filter((item)=>item.status==="new").length],
    ["businesses","Negocios",data.businesses.length],
    ["applications","Solicitudes",data.applications.filter((item)=>item.status==="pending").length],
    ["users","Usuarios",data.users.length],
    ["levels","Niveles",data.levels.length],
    ["places","Lugares",null],
    ["benefits","Beneficios",data.benefits.length],
    ["audit","Historial",null],
  ];
  // /equipo reads its key from sessionStorage and sends it as a bearer token; a boss session is accepted there too.
  const openAgents=()=>{try{sessionStorage.setItem(TEAM_KEY,token)}catch{} window.location.href="/equipo"};

  return <section className="team-section">
    <div className="team-tabs" role="tablist">
      {tabs.map(([id,name,count])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?"":"team-quiet"} onClick={()=>setTab(id)}>{name}{count===null?"":` (${count})`}</button>)}
      <button type="button" className="team-quiet" onClick={openAgents}>Agentes ↗</button>
    </div>
    {error&&<p className="team-error" role="alert">{error}</p>}

    {tab==="approvals"&&<article className="team-agent">
      <h3>Empresas por aprobar</h3>
      {!pendingCompanies.length&&<p className="team-empty">Nada por aprobar.</p>}
      <ul className="team-drafts">{pendingCompanies.map((user)=><li key={user.id}>
        <div><small>{user.country} · desde el {when(user.createdAt)}</small><b>{data.businesses.filter((business)=>business.ownerId===user.id).map((business)=>`${business.name} (${kindNames[business.kind]??business.kind}, ${business.region})`).join(" · ")||"Sin negocio"}</b>
          <span>{user.firstName} · {user.email||"sin correo"}</span></div>
        <div className="team-actions"><button type="button" disabled={busy} onClick={()=>act({action:"approve-business",userId:user.id})}>Aprobar empresa</button>
          <ReasonAction label="Rechazar" confirm="Rechazar empresa" placeholder="Motivo (la empresa lo verá)" busy={busy} onConfirm={(reason)=>act({action:"reject-business",userId:user.id,reason})}/></div>
      </li>)}</ul>
      <h4>Servicios por aprobar</h4>
      {!pendingServices.length&&<p className="team-empty">Nada por aprobar.</p>}
      <ul className="team-drafts">{pendingServices.map((service)=><li key={service.id} className="panel-stack">
        <ServiceSummary service={service}/>
        <div className="team-actions"><button type="button" disabled={busy} onClick={()=>act({action:"service-status",id:service.id,status:"published"})}>Aprobar y publicar</button>
          <ReasonAction label="Rechazar" confirm="Rechazar servicio" placeholder="Qué debe corregir (la empresa lo verá)" busy={busy} onConfirm={(note)=>act({action:"service-status",id:service.id,status:"rejected",note})}/></div>
      </li>)}</ul>
      <h4>Promociones pendientes</h4>
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
      <h4>Todas las promociones</h4>
      {!data.promotions.length&&<p className="team-empty">Todavía no hay promociones.</p>}
      <ul className="team-drafts">{data.promotions.map((promotion)=><li key={promotion.id}>
        <div><small>{promotion.business} · {statusNames[promotion.status]} · hasta el {day(promotion.validUntil)}</small><b>{promotion.title}</b></div>
        <div className="team-actions"><DeleteAction what="la promoción" busy={busy} onConfirm={remove("promotion",promotion.id)}/></div>
      </li>)}</ul>
    </article>}

    {tab==="services"&&<article className="team-agent"><h3>Servicios de las empresas</h3>
      <p className="team-empty">Lo que ven los viajeros. Ocultar un servicio lo devuelve a la empresa con tu motivo.</p>
      {!data.services.length&&<p className="team-empty">Todavía no hay servicios.</p>}
      <ul className="team-drafts">{data.services.map((service)=><li key={service.id} className="panel-stack">
        <ServiceSummary service={service}/>
        <div className="team-actions">
          {service.status==="published"
            ?<ReasonAction label="Ocultar" confirm="Ocultar servicio" placeholder="Motivo (la empresa lo verá)" busy={busy} onConfirm={(note)=>act({action:"service-status",id:service.id,status:"rejected",note})}/>
            :<button type="button" disabled={busy} onClick={()=>act({action:"service-status",id:service.id,status:"published"})}>Publicar</button>}
          <DeleteAction what="el servicio" busy={busy} onConfirm={remove("service",service.id)}/>
        </div>
      </li>)}</ul>
    </article>}

    {tab==="reviews"&&<article className="team-agent"><h3>Opiniones de viajeros</h3>
      {!data.reviews.length&&<p className="team-empty">Todavía no hay opiniones.</p>}
      <ul className="team-drafts">{data.reviews.map((review)=><li key={review.id}>
        <div><small>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} · {review.placeId} · {when(review.createdAt)} · {statusNames[review.status??"published"]}</small><b>{review.authorName}</b><p>{review.comment}</p></div>
        <div className="team-actions"><button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"review-status",id:review.id,status:review.status==="hidden"?"published":"hidden"})}>{review.status==="hidden"?"Volver a publicar":"Ocultar"}</button>
          <DeleteAction what="la opinión" busy={busy} onConfirm={remove("review",review.id)}/></div>
      </li>)}</ul>
    </article>}

    {tab==="suggestions"&&<article className="team-agent"><h3>Sugerencias</h3>
      {!data.suggestions.length&&<p className="team-empty">Todavía no hay sugerencias.</p>}
      <ul className="team-drafts">{data.suggestions.map((item)=><li key={item.id}>
        <div><small>{roleNames[item.role as Role]??"Sin cuenta"} · {when(item.created_at)} · {statusNames[item.status]}</small><p>{item.message}</p></div>
        <div className="team-actions">{item.status!=="read"&&<button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"suggestion-status",id:item.id,status:"read"})}>Leída</button>}{item.status!=="done"&&<button type="button" disabled={busy} onClick={()=>act({action:"suggestion-status",id:item.id,status:"done"})}>Resuelta</button>}
          <DeleteAction what="la sugerencia" busy={busy} onConfirm={remove("suggestion",item.id)}/></div>
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
          <label>Dueño<select name="ownerId" defaultValue={business.ownerId??""}><option value="">Sin dueño</option>{owners.map((user)=><option key={user.id} value={user.id}>{user.firstName} · {user.email||"cuenta de prueba"}</option>)}</select></label>
          <label>Id de su ficha en el mapa<input name="placeId" defaultValue={business.placeId??""} maxLength={64} placeholder="opcional"/></label>
          <div className="team-actions wide">
            <button type="submit" className="team-quiet" disabled={busy}>Guardar vínculo</button>
            <button type="button" disabled={busy} onClick={()=>act({action:"update-business",partnerId:business.id,status:business.status==="published"?"draft":"published"})}>{business.status==="published"?"Despublicar":"Publicar"}</button>
            {business.active&&<button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"update-business",partnerId:business.id,deactivate:true})}>Apagar «atendiendo»</button>}
            <ReasonAction label="Eliminar negocio" confirm="Eliminar con sus fotos y promociones" placeholder="Motivo (queda en el historial)" busy={busy} danger onConfirm={remove("business",business.id)}/>
          </div>
        </form>
      </li>)}</ul>
    </article>}

    {tab==="applications"&&<article className="team-agent"><h3>Solicitudes de negocios</h3>
      {!data.applications.length&&<p className="team-empty">Todavía no hay solicitudes.</p>}
      <ul className="team-drafts">{data.applications.map((item)=><li key={item.id}>
        <div><small>{item.category} · {when(item.createdAt)} · {statusNames[item.status]}</small><b>{item.businessName}</b><span>{item.contactName}{item.email?` · ${item.email}`:""}{item.phone?` · ${item.phone}`:""}</span><p>{item.description}</p><span>{item.address}</span></div>
        <div className="team-actions">
          {item.status==="pending"&&<><button type="button" disabled={busy} onClick={()=>act({action:"create-business",applicationId:item.id,name:item.businessName,kind:"venue",region:"RM",phone:item.phone,url:item.website,address:item.address})}>Crear negocio</button>
          <button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"application-status",id:item.id,status:"rejected"})}>Rechazar</button></>}
          <DeleteAction what="la solicitud" busy={busy} onConfirm={remove("application",item.id)}/>
        </div>
      </li>)}</ul>
    </article>}

    {tab==="users"&&<UsersTab data={data} busy={busy} act={act}/>}
    {tab==="levels"&&<LevelsTab data={data} busy={busy} act={act}/>}
    {tab==="places"&&<PlacesTab token={token} onChange={()=>run(async()=>{})}/>}
    {tab==="audit"&&<AuditTab data={data}/>}

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

// A service as the admin reviews it: everything the traveller will see, plus its status.
function ServiceSummary({service}:{service:ManagedService}){
  return <div>
    <small>{service.business} · {categoryNames.es[service.category]} · {statusNames[service.status]} · {priceLabel(service,"es")}{service.duration?` · ${service.duration}`:""}</small>
    <b>{service.title}</b><p>{service.description}</p>
    <span>{[service.languages.length?`Idiomas: ${service.languages.join(", ")}`:"",service.whatsapp?`WhatsApp ${service.whatsapp}`:"",service.phone?`Tel. ${service.phone}`:"",service.bookingUrl??""].filter(Boolean).join(" · ")}</span>
    {service.status==="rejected"&&service.reviewNote&&<p className="panel-reason-note">Motivo: {service.reviewNote}</p>}
    {service.photos.length>0&&<div className="panel-thumbs">{service.photos.map((item)=><img key={item.path} src={item.url} alt={`Foto de ${service.title}`} loading="lazy"/>)}</div>}
  </div>;
}

function UsersTab({data,busy,act}:{data:AdminData;busy:boolean;act:Act}){
  const [query,setQuery]=useState("");
  const [type,setType]=useState("");
  const [state,setState]=useState("");
  const levelName=new Map(data.levels.map((level)=>[level.code,level.name]));
  const words=query.trim().toLowerCase();
  const shown=data.users.filter((user)=>(!type||user.type===type)&&(!state||user.state===state)
    &&(!words||`${user.firstName} ${user.email} ${user.country} ${user.rut??""}`.toLowerCase().includes(words)));

  return <article className="team-agent"><h3>Usuarios</h3>
    <div className="panel-filters">
      <input type="search" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar por nombre, correo o país" aria-label="Buscar usuarios"/>
      <select value={type} onChange={(event)=>setType(event.target.value)} aria-label="Tipo de cuenta"><option value="">Todos los tipos</option>{Object.entries(typeNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>
      <select value={state} onChange={(event)=>setState(event.target.value)} aria-label="Estado"><option value="">Todos los estados</option>{Object.entries(stateNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>
    </div>
    <p className="team-empty">{shown.length} de {data.users.length} cuentas.</p>
    <ul className="team-drafts">{shown.map((user)=>{
      const self=user.id===data.me;
      return <li key={user.id} className="panel-stack">
        <div><small>{typeNames[user.type]} · nivel {levelName.get(user.level)??user.level}{user.levelUntil?` hasta el ${day(isoDay(user.levelUntil))}`:""} · {user.country} · desde el {when(user.createdAt)}</small>
          <b>{user.firstName}{self?" (tú)":""}</b><span>{user.email||"Cuenta de prueba, sin correo"}{user.rut?` · RUT ${user.rut}`:""}</span>
          {user.type==="empresa"&&user.approval!=="aprobada"&&<p className="panel-reason-note">{user.approval==="pendiente"?"Empresa en revisión: apruébala en Aprobaciones.":`Empresa rechazada${user.approvalReason?` · Motivo: ${user.approvalReason}`:""}`}</p>}
          {user.state!=="activo"&&<p className="panel-reason-note">{stateNames[user.state]}{user.stateAt?` el ${when(user.stateAt)}`:""} · Motivo: {user.stateReason}</p>}</div>
        <details className="panel-details"><summary>Administrar</summary>
          <form className="panel-form" key={`profile|${user.firstName}|${user.country}`} onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;act({action:"edit-user",userId:user.id,firstName:field(form,"firstName"),country:field(form,"country")})}}>
            <label>Nombre<input name="firstName" defaultValue={user.firstName} minLength={2} maxLength={60} required/></label>
            <label>País<input name="country" defaultValue={user.country} minLength={2} maxLength={80} required/></label>
            <div className="team-actions wide"><button type="submit" className="team-quiet" disabled={busy}>Guardar perfil</button></div>
          </form>
          <form className="panel-form" key={`level|${user.level}|${user.levelUntil}`} onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;act({action:"set-level",userId:user.id,level:field(form,"level"),until:field(form,"until")})}}>
            <label>Nivel<select name="level" defaultValue={user.level}>{levelCodes.map((code)=><option key={code} value={code}>{levelName.get(code)??code}</option>)}</select></label>
            <label>Vence (opcional)<input name="until" type="date" defaultValue={user.levelUntil?isoDay(user.levelUntil):""}/></label>
            <div className="team-actions wide"><button type="submit" className="team-quiet" disabled={busy}>Guardar nivel</button></div>
          </form>
          <form className="panel-form" key={`rut|${user.rut}`} onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;act({action:"set-rut",userId:user.id,rut:field(form,"rut")})}}>
            <label>RUT, opcional: solo para quien tenga RUT chileno {user.rut?`(guardado: ${user.rut})`:""}<input name="rut" required maxLength={12} placeholder="12.345.678-5" autoComplete="off"/></label>
            <div className="team-actions"><button type="submit" className="team-quiet" disabled={busy}>{user.rut?"Cambiar RUT":"Guardar RUT"}</button>
              {user.rut&&<button type="button" className="team-quiet" disabled={busy} onClick={()=>act({action:"remove-rut",userId:user.id})}>Quitar RUT</button>}</div>
          </form>
          {self?<p className="team-empty">Esta es la única cuenta admin: su tipo y su estado no se pueden cambiar desde el panel.</p>:<>
            {/* Only one admin account exists, so another account can only be a client or a business. */}
            <label className="panel-inline">Tipo de cuenta<select value={user.type} disabled={busy} onChange={(event)=>act({action:"set-type",userId:user.id,type:event.target.value})}><option value="cliente">Cliente</option><option value="empresa">Empresa</option></select></label>
            <div className="team-actions panel-gap">
              {user.state==="activo"?<>
                <ReasonAction label="Bloquear" confirm="Bloquear cuenta" placeholder="Motivo (el usuario lo verá)" busy={busy} onConfirm={(reason)=>act({action:"set-state",userId:user.id,state:"bloqueado",reason})}/>
                <ReasonAction label="Desactivar" confirm={user.type==="empresa"?"Desactivar y despublicar sus negocios":"Desactivar cuenta"} placeholder="Motivo, por ejemplo: el local cerró" busy={busy} onConfirm={(reason)=>act({action:"set-state",userId:user.id,state:"inactivo",reason})}/>
              </>:<button type="button" disabled={busy} onClick={()=>act({action:"set-state",userId:user.id,state:"activo"})}>Reactivar</button>}
              <ReasonAction label="Eliminar cuenta" confirm="Eliminar cuenta para siempre" placeholder="Motivo (queda en el historial)" busy={busy} danger onConfirm={(reason)=>act({action:"delete-user",userId:user.id,reason})}/>
            </div>
          </>}
        </details>
      </li>;
    })}</ul>
  </article>;
}

function LevelsTab({data,busy,act}:{data:AdminData;busy:boolean;act:Act}){
  return <article className="team-agent"><h3>Niveles de cuenta</h3>
    <p className="team-empty">Qué incluye cada nivel, un beneficio por línea. El nivel de cada cuenta se asigna en Usuarios. El precio queda vacío mientras el nivel no se venda.</p>
    <ul className="team-drafts">{data.levels.map((level)=>{
      const count=data.users.filter((user)=>user.level===level.code).length;
      return <li key={level.code} className="panel-stack">
        <div><small>{count} {count===1?"cuenta":"cuentas"}{level.monthlyPrice!==null?` · $${level.monthlyPrice.toLocaleString("es-CL")} al mes`:""}</small><b>{level.name}</b></div>
        <form className="panel-form" key={JSON.stringify(level)} onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;act({action:"save-level",code:level.code,name:field(form,"name"),monthlyPrice:field(form,"monthlyPrice"),clientBenefits:field(form,"clientBenefits"),businessBenefits:field(form,"businessBenefits")})}}>
          <label>Nombre<input name="name" defaultValue={level.name} minLength={2} maxLength={40} required/></label>
          <label>Precio mensual en CLP (opcional)<input name="monthlyPrice" inputMode="numeric" pattern="[0-9]*" defaultValue={level.monthlyPrice??""}/></label>
          <label>Para clientes<textarea name="clientBenefits" rows={3} defaultValue={level.clientBenefits.join("\n")}/></label>
          <label>Para empresas<textarea name="businessBenefits" rows={3} defaultValue={level.businessBenefits.join("\n")}/></label>
          <div className="team-actions wide"><button type="submit" disabled={busy}>Guardar {level.name}</button></div>
        </form>
      </li>;
    })}</ul>
  </article>;
}

// The map has thousands of places, so they are searched on demand instead of coming with the rest of the panel.
// onChange reloads the rest of the panel, so the history shows the change.
function PlacesTab({token,onChange}:{token:string;onChange:()=>Promise<void>}){
  const [places,setPlaces]=useState<PlaceRow[]|null>(null);
  const [search,setSearch]=useState({query:"",region:""});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function load(next:{query:string;region:string}){
    setBusy(true);setError("");
    try{setPlaces((await api<{places:PlaceRow[]}>(token,`/api/admin?places=${encodeURIComponent(next.query)}&region=${next.region}`)).places);setSearch(next)}
    catch(cause){setError(message(cause))}
    finally{setBusy(false)}
  }
  async function change(body:Record<string,unknown>){
    setBusy(true);setError("");
    try{await api(token,"/api/admin",body);await onChange()}catch(cause){setError(message(cause))}
    finally{setBusy(false)}
    await load(search);
  }
  return <article className="team-agent"><h3>Lugares del mapa</h3>
    <p className="team-empty">Un lugar oculto deja de verse en el mapa (puede tardar hasta una hora) y una nueva importación no lo vuelve a mostrar.</p>
    <form className="panel-filters" onSubmit={(event)=>{event.preventDefault();const form=event.currentTarget;void load({query:field(form,"query"),region:field(form,"region")})}}>
      <input type="search" name="query" placeholder="Nombre del lugar" aria-label="Nombre del lugar" maxLength={60}/>
      <select name="region" defaultValue="" aria-label="Región"><option value="">Todas las regiones</option>{regions.map((region)=><option key={region}>{region}</option>)}</select>
      <button type="submit" disabled={busy}>Buscar</button>
    </form>
    {error&&<p className="team-error" role="alert">{error}</p>}
    {places&&!places.length&&<p className="team-empty">No encontramos lugares con esa búsqueda.</p>}
    {places&&places.length>=60&&<p className="team-empty">Se muestran los primeros 60. Escribe más del nombre para acotar.</p>}
    <ul className="team-drafts">{places?.map((place)=><li key={place.id}>
      <div><small>{place.region} · {place.locality} · {place.category}{place.rating?` · ★ ${place.rating}`:""} · {statusNames[place.status]}</small><b>{place.name}</b>{place.address&&<span>{place.address}</span>}</div>
      <div className="team-actions">{place.status==="published"
        ?<ReasonAction label="Ocultar" confirm="Ocultar del mapa" placeholder="Motivo, por ejemplo: cerró" busy={busy} onConfirm={(reason)=>void change({action:"place-status",placeId:place.id,status:"hidden",reason})}/>
        :<button type="button" disabled={busy} onClick={()=>void change({action:"place-status",placeId:place.id,status:"published"})}>Volver a mostrar</button>}</div>
    </li>)}</ul>
  </article>;
}

// What changed, in a line: "campo: antes → después" for edits, the fields kept for deletions.
const shortValue=(value:unknown)=>{if(value===undefined||value===null)return"—";const shown=typeof value==="string"?value:JSON.stringify(value);return shown&&shown.length>40?`${shown.slice(0,40)}…`:String(shown)};
function changeLine(entry:AuditEntry){
  if(entry.action==="crear")return "";
  const keys=Object.keys({...entry.before,...entry.after}).slice(0,5);
  return keys.map((key)=>entry.before&&entry.after?`${key}: ${shortValue(entry.before[key])} → ${shortValue(entry.after[key])}`:`${key}: ${shortValue((entry.after??entry.before)?.[key])}`).join(" · ");
}

function AuditTab({data}:{data:AdminData}){
  const [table,setTable]=useState("");
  const names=new Map(data.users.map((user)=>[user.id,user.firstName]));
  const tables=[...new Set(data.audit.map((entry)=>entry.table))];
  const shown=data.audit.filter((entry)=>!table||entry.table===table);
  return <article className="team-agent"><h3>Historial de cambios</h3>
    <p className="team-empty">Las últimas 200 acciones. Nadie puede modificar ni borrar este historial.</p>
    <div className="panel-filters"><select value={table} onChange={(event)=>setTable(event.target.value)} aria-label="Sección"><option value="">Todas las secciones</option>{tables.map((id)=><option key={id} value={id}>{tableNames[id]??id}</option>)}</select></div>
    {!shown.length&&<p className="team-empty">Todavía no hay cambios registrados.</p>}
    <ul className="team-drafts">{shown.map((entry)=>{
      const who=entry.actorId?names.get(entry.actorId)??"Cuenta eliminada":entry.origin==="base"?"Sistema":"Servidor";
      const record=entry.recordId&&(names.get(entry.recordId)??(entry.recordId.length>12?entry.recordId.slice(0,8):`#${entry.recordId}`));
      const line=changeLine(entry);
      return <li key={entry.id}><div>
        <small>{when(entry.createdAt)} · {who} · {tableNames[entry.table]??entry.table}</small>
        <b>{actionNames[entry.action]??entry.action}{record?` · ${record}`:""}</b>
        {entry.reason&&<p>Motivo: {entry.reason}</p>}
        {line&&<span>{line}</span>}
      </div></li>;
    })}</ul>
  </article>;
}
