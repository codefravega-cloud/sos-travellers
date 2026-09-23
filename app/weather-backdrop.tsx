"use client";

import { useEffect, useState } from "react";
import { Locale } from "./places";

type Weather = { temperature:number; apparent:number; wind:number; precipitation:number; maximum:number; minimum:number; kind:string; observedAt:string };

const copy:Record<Locale,{title:string;feels:string;range:string;rain:string;wind:string;loading:string;unavailable:string;conditions:Record<string,string>}>= {
  es:{title:"Clima ahora · Santiago",feels:"Sensación",range:"Máx / mín",rain:"Lluvia",wind:"Viento",loading:"Actualizando clima…",unavailable:"Clima no disponible",conditions:{clear:"Despejado",cloudy:"Nublado",fog:"Neblina",rain:"Lluvia",storm:"Tormenta",snow:"Nieve",night:"Noche despejada"}},
  en:{title:"Weather now · Santiago",feels:"Feels like",range:"High / low",rain:"Rain",wind:"Wind",loading:"Updating weather…",unavailable:"Weather unavailable",conditions:{clear:"Clear",cloudy:"Cloudy",fog:"Fog",rain:"Rain",storm:"Storm",snow:"Snow",night:"Clear night"}},
  pt:{title:"Clima agora · Santiago",feels:"Sensação",range:"Máx / mín",rain:"Chuva",wind:"Vento",loading:"Atualizando clima…",unavailable:"Clima indisponível",conditions:{clear:"Céu limpo",cloudy:"Nublado",fog:"Neblina",rain:"Chuva",storm:"Tempestade",snow:"Neve",night:"Noite limpa"}},
  fr:{title:"Météo actuelle · Santiago",feels:"Ressenti",range:"Max / min",rain:"Pluie",wind:"Vent",loading:"Mise à jour météo…",unavailable:"Météo indisponible",conditions:{clear:"Dégagé",cloudy:"Nuageux",fog:"Brouillard",rain:"Pluie",storm:"Orage",snow:"Neige",night:"Nuit dégagée"}},
};

export default function WeatherBackdrop({locale}:{locale:Locale}) {
  const [weather,setWeather]=useState<Weather|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    fetch("/api/weather").then(async(response)=>{
      if(!response.ok) throw new Error();
      setWeather(await response.json());
    }).catch(()=>setFailed(true));
  },[]);
  const t=copy[locale];
  const kind=weather?.kind??"cloudy";
  return <>
    <div className={`weather-backdrop weather-${kind}`} aria-hidden="true"><i className="weather-sun"/><i className="weather-cloud cloud-one"/><i className="weather-cloud cloud-two"/><i className="weather-precip"/></div>
    <aside className="weather-widget" aria-live="polite">
      {!weather?<span>{failed?t.unavailable:t.loading}</span>:<>
        <div className="weather-current"><span className="weather-icon" aria-hidden="true">{kind==="rain"?"☂":kind==="storm"?"ϟ":kind==="snow"?"❄":kind==="night"?"☾":kind==="clear"?"☀":"☁"}</span><div><small>{t.title}</small><strong>{weather.temperature}°</strong><b>{t.conditions[kind]??kind}</b></div></div>
        <dl><div><dt>{t.feels}</dt><dd>{weather.apparent}°</dd></div><div><dt>{t.range}</dt><dd>{weather.maximum}° / {weather.minimum}°</dd></div><div><dt>{t.rain}</dt><dd>{weather.precipitation}%</dd></div><div><dt>{t.wind}</dt><dd>{weather.wind} km/h</dd></div></dl>
      </>}
    </aside>
  </>;
}
