import { useEffect, useState } from "react";
import type { RegionId } from "./chile-regions";
import { Place, places as santiagoPlaces } from "./places";

const cache=new Map<RegionId,Place[]>();
// Until the places table has data for a region, the hand-curated Santiago
// list is the only content available.
const fallback=(region:RegionId)=>region==="RM"?santiagoPlaces:[];

export function usePlaces(region:RegionId) {
  const [loaded,setLoaded]=useState<{region:RegionId;places:Place[]}|null>(null);
  useEffect(()=>{
    if(cache.has(region)) return;
    let cancelled=false;
    fetch(`/api/places?region=${region}`)
      .then((response)=>response.ok?response.json() as Promise<{places?:Place[]}>:Promise.reject())
      .then((data)=>{ const list=data.places?.length?data.places:fallback(region); cache.set(region,list); return list; })
      .catch(()=>fallback(region))
      .then((list)=>{ if(!cancelled) setLoaded({region,places:list}); });
    return()=>{ cancelled=true; };
  },[region]);
  const ready=cache.get(region)??(loaded?.region===region?loaded.places:null);
  return { places:ready??fallback(region), loading:!ready };
}
