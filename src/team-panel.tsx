import { FormEvent, useCallback, useEffect, useState } from "react";

// Internal tool for the team: Spanish only, behind TEAM_PANEL_KEY (see api/_routes/team.ts).
type Source={name:string;url:string;ok:boolean;note?:string};
type Run={id:number;agent:string;section:string;status:"ok"|"error";startedAt:string;finishedAt:string;summary?:string;created:number;skipped:number;details:{sources?:Source[];rejected?:{title:string;reason:string}[];duplicates?:number;metrics?:{label:string;value:number;hint?:string}[];attention?:string[]}};
type Status="draft"|"published"|"hidden";
type Action="publish"|"discard"|"unpublish"|"restore";
type EventRow={id:number;title:string;venue:string;category:string;region:string;startsAt:string;priceLabel?:string;url?:string;summary?:string;status:Status};
type Panel={runs:Run[];events:EventRow[]};

const KEY="sos-team-key",ZONE="America/Santiago";
const sections=[
  {id:"contenido",name:"Contenido",role:"Guías, eventos y lugares al día."},
  {id:"comercial",name:"Comercial",role:"Clientes, colaboradores y solicitudes."},
  {id:"desarrollo",name:"Desarrollo",role:"Que el sitio funcione y mejore."},
  {id:"administracion",name:"Administración",role:"Cuentas, contratos y finanzas."},
] as const;
// Mirrors the agent check in supabase/migrations/202610050003_agent_runs_weekly_summary.sql.
const agents=[
  {id:"events",section:"contenido",name:"Eventos semanales",schedule:"Lunes 9:00",task:"Busca los eventos de las próximas dos semanas en la Región Metropolitana, en recintos reconocidos y pensados para turistas, y los deja como pendientes."},
  {id:"weekly-summary",section:"administracion",name:"Resumen semanal",schedule:"Lunes 10:00",task:"Cuenta lo que pasó en los últimos 7 días y avisa qué necesita atención en cada sección."},
];
// Each tab lists one status; its buttons are the actions api/_routes/team.ts allows from that status.
const tabs:{status:Status;name:string;empty:string;actions:{action:Action;label:string;quiet?:boolean}[]}[]=[
  {status:"draft",name:"Pendientes",empty:"No hay eventos pendientes de aprobación.",actions:[{action:"publish",label:"Aprobar y subir"},{action:"discard",label:"Descartar",quiet:true}]},
  {status:"published",name:"Subidos",empty:"No hay eventos subidos para los próximos días.",actions:[{action:"unpublish",label:"Bajar del sitio",quiet:true}]},
  {status:"hidden",name:"Descartados",empty:"No hay eventos descartados.",actions:[{action:"restore",label:"Volver a pendientes",quiet:true}]},
];
const categories:Record<string,string>={concert:"Concierto",circus:"Circo",theatre:"Teatro",festival:"Festival",fair:"Feria",sport:"Deporte",party:"Fiesta",other:"Otro"};

const when=(iso:string)=>new Intl.DateTimeFormat("es-CL",{timeZone:ZONE,weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const readKey=()=>{try{return sessionStorage.getItem(KEY)??""}catch{return ""}};

type Loaded={state:"ok";panel:Panel}|{state:"denied"}|{state:"failed";message:string};

async function fetchPanel(secret:string):Promise<Loaded>{
  try{
    const response=await fetch("/api/team",{headers:{Authorization:`Bearer ${secret}`}});
    if(response.status===401)return{state:"denied"};
    const body=await response.json();
    if(!response.ok)return{state:"failed",message:body.error||"El panel no está disponible por ahora."};
    try{sessionStorage.setItem(KEY,secret)}catch{}
    return{state:"ok",panel:body};
  }catch{
    return{state:"failed",message:"El panel no está disponible por ahora."};
  }
}

export default function TeamPanel(){
  const [key,setKey]=useState(readKey);
  const [typed,setTyped]=useState("");
  const [panel,setPanel]=useState<Panel|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState<number|null>(null);
  const [tab,setTab]=useState<Status>("draft");

  useEffect(()=>{
    document.title="Equipo · SOS Travellers";
    const meta=document.createElement("meta");
    meta.name="robots";meta.content="noindex,nofollow";
    document.head.append(meta);
    return()=>meta.remove();
  },[]);

  const apply=useCallback((result:Loaded)=>{
    if(result.state==="denied"){
      try{sessionStorage.removeItem(KEY)}catch{}
      setKey("");setPanel(null);setError("Clave incorrecta.");
    }else if(result.state==="failed")setError(result.message);
    else{setPanel(result.panel);setError("")}
  },[]);

  useEffect(()=>{
    if(!key)return;
    let alive=true;
    void fetchPanel(key).then((result)=>{if(alive)apply(result)});
    return()=>{alive=false};
  },[key,apply]);

  const load=async()=>apply(await fetchPanel(key));

  function enter(event:FormEvent){
    event.preventDefault();
    if(typed.trim())setKey(typed.trim());
    setTyped("");
  }

  function leave(){
    try{sessionStorage.removeItem(KEY)}catch{}
    setKey("");setPanel(null);
  }

  async function decide(row:EventRow,action:Action){
    setBusy(row.id);setError("");
    try{
      const response=await fetch("/api/team",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({action,eventId:row.id})});
      if(!response.ok&&response.status!==409)throw new Error((await response.json()).error);
      await load();
    }catch(cause){
      setError(cause instanceof Error&&cause.message?cause.message:"No pudimos guardar el cambio.");
    }finally{setBusy(null)}
  }

  if(!key)return <main className="team team-gate">
    <form onSubmit={enter}>
      <p className="team-eyebrow">SOS TRAVELLERS · EQUIPO</p>
      <h1>Panel del equipo</h1>
      <label htmlFor="team-key">Clave del panel</label>
      <input id="team-key" type="password" autoComplete="current-password" value={typed} onChange={(event)=>setTyped(event.target.value)} autoFocus/>
      <button type="submit">Entrar</button>
      {error&&<p className="team-error" role="alert">{error}</p>}
    </form>
  </main>;

  return <main className="team">
    <header className="team-top">
      <div><p className="team-eyebrow">SOS TRAVELLERS · EQUIPO</p><h1>Agentes por sección</h1></div>
      <div className="team-actions"><button type="button" onClick={()=>void load()}>Actualizar</button><button type="button" className="team-quiet" onClick={leave}>Salir</button></div>
    </header>
    {error&&<p className="team-error" role="alert">{error}</p>}
    {!panel&&!error&&<p className="team-empty">Cargando…</p>}
    {panel&&sections.map((section)=>{
      const own=agents.filter((agent)=>agent.section===section.id);
      return <section key={section.id} className="team-section" aria-labelledby={`team-${section.id}`}>
        <div className="team-section-head"><h2 id={`team-${section.id}`}>{section.name}</h2><p>{section.role}</p></div>
        {!own.length&&<p className="team-empty">Sin agentes todavía.</p>}
        {own.map((agent)=>{
          const runs=panel.runs.filter((run)=>run.agent===agent.id),last=runs[0];
          return <article key={agent.id} className="team-agent">
            <div className="team-agent-head">
              <div><h3>{agent.name}</h3><p>{agent.task}</p></div>
              <span className={`team-pill ${last?last.status:"idle"}`}>{!last?"Sin corridas":last.status==="ok"?"Funcionando":"Con error"}</span>
            </div>
            {agent.id==="events"?<dl className="team-stats">
              <div><dt>Programado</dt><dd>{agent.schedule}</dd></div>
              <div><dt>Última corrida</dt><dd>{last?when(last.finishedAt):"—"}</dd></div>
              <div><dt>Pendientes</dt><dd>{panel.events.filter((row)=>row.status==="draft").length}</dd></div>
              <div><dt>Subidos</dt><dd>{panel.events.filter((row)=>row.status==="published").length}</dd></div>
            </dl>:<dl className="team-stats">
              <div><dt>Programado</dt><dd>{agent.schedule}</dd></div>
              <div><dt>Última corrida</dt><dd>{last?when(last.finishedAt):"—"}</dd></div>
            </dl>}
            {last?.summary&&<p className="team-summary">{last.summary}</p>}
            {!!last?.details.metrics?.length&&<>
              <h4>Últimos 7 días</h4>
              <dl className="team-stats team-metrics">{last.details.metrics.map((metric)=><div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd>{metric.hint&&<small>{metric.hint}</small>}</div>)}</dl>
            </>}
            {!!last?.details.attention?.length&&<div className="team-sources">
              <h4>Necesita atención</h4>
              <ul>{last.details.attention.map((item)=><li key={item} className="fail"><span>{item}</span></li>)}</ul>
            </div>}
            {!!last?.details.sources?.length&&<div className="team-sources">
              <h4>Fuentes revisadas</h4>
              <ul>{last.details.sources.map((source)=><li key={source.url} className={source.ok?"ok":"fail"}>
                <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a><span>{source.ok?"Leída":"No se pudo leer"}{source.note?` · ${source.note}`:""}</span>
              </li>)}</ul>
            </div>}
            {!!last?.details.rejected?.length&&<div className="team-sources">
              <h4>Descartados por el validador</h4>
              <ul>{last.details.rejected.map((item,index)=><li key={index} className="fail"><b>{item.title||"Sin título"}</b><span>{item.reason}</span></li>)}</ul>
            </div>}

            {agent.id==="events"&&<>
              <h4>Eventos</h4>
              <div className="team-tabs" role="tablist">{tabs.map((item)=><button key={item.status} type="button" role="tab" aria-selected={tab===item.status} className={tab===item.status?"":"team-quiet"} onClick={()=>setTab(item.status)}>{item.name} ({panel.events.filter((row)=>row.status===item.status).length})</button>)}</div>
              {tabs.filter((item)=>item.status===tab).map((item)=>{
                const rows=panel.events.filter((row)=>row.status===item.status);
                return <div key={item.status} role="tabpanel">
                  {!rows.length&&<p className="team-empty">{item.empty}</p>}
                  <ul className="team-drafts">{rows.map((row)=><li key={row.id}>
                    <div>
                      <small>{categories[row.category]??row.category} · {row.region} · {when(row.startsAt)}</small>
                      <b>{row.title}</b>
                      <span>{row.venue}{row.priceLabel?` · ${row.priceLabel}`:""}</span>
                      {row.summary&&<p>{row.summary}</p>}
                      {row.url&&<a href={row.url} target="_blank" rel="noreferrer">Ver fuente oficial ↗</a>}
                    </div>
                    <div className="team-actions">{item.actions.map((button)=><button key={button.action} type="button" className={button.quiet?"team-quiet":""} disabled={busy===row.id} onClick={()=>void decide(row,button.action)}>{button.label}</button>)}</div>
                  </li>)}</ul>
                </div>;
              })}
            </>}

            {runs.length>1&&<details className="team-history"><summary>Historial ({runs.length} corridas)</summary>
              <table><thead><tr><th>Fecha</th><th>Estado</th><th>Resultado</th></tr></thead>
                <tbody>{runs.map((run)=><tr key={run.id}><td>{when(run.finishedAt)}</td><td>{run.status==="ok"?"OK":"Error"}</td><td>{agent.id==="events"?`${run.created} creados · ${run.skipped} omitidos`:run.summary??"—"}</td></tr>)}</tbody>
              </table>
            </details>}
          </article>;
        })}
      </section>;
    })}
  </main>;
}
