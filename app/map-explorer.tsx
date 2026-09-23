"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Category, Locale, Place, places } from "./places";

type Review = { id:number; author_name:string; rating:number; comment:string; created_at:string };
type ReviewSummary = { count:number; average:number | null };

const copy = {
  es:{ city:"Santiago, Chile", eyebrow:"SANTIAGO, BIEN SELECCIONADO", title:"Lugares que sí suman", lede:"Un solo mapa para decidir mejor: lugares bien valorados, información práctica y opiniones reales de otros viajeros.", locate:"Usar mi ubicación", locationHint:"Encuentra qué recomendación está más cerca de ti.", all:"Todos", museum:"Museos", coffee:"Cafeterías", food:"Comida chilena", view:"Paseos y vistas", stay:"Hoteles", useful:"Útiles", market:"Mercados", shop:"Compras", experience:"Experiencias", growshop:"Growshops", search:"Buscar por nombre o comuna…", selected:"lugares seleccionados", google:"Fotos, reseñas y ruta en Google Maps", neighborhood:"Barrio", time:"Tiempo sugerido", languages:"Idiomas / información", googleRating:"Referencia Google", community:"Opinión SOS", opinions:"Opiniones de viajeros", noOpinions:"Todavía no hay opiniones. Sé la primera persona en contar cómo fue.", write:"Comparte tu experiencia", name:"Tu nombre", comment:"¿Qué debería saber otro viajero?", send:"Publicar opinión", sending:"Publicando…", success:"¡Gracias! Tu opinión ya está publicada.", choose:"Selecciona una calificación", source:"Referencias y valoraciones de Google Maps revisadas el 23 de septiembre de 2026; pueden cambiar. Las imágenes mostradas provienen de fuentes oficiales acreditadas. Verifica horarios, idiomas y tarifas antes de salir.", mapHelp:"Toca un marcador o una ficha para ver todos los detalles.", detail:"Información del lugar", reviewsCount:"opiniones", official:"Sitio oficial", error:"No pudimos cargar las opiniones ahora.", footer:"Tu copiloto local, ciudad por ciudad." },
  en:{ city:"Santiago, Chile", eyebrow:"SANTIAGO, WELL CHOSEN", title:"Places worth your time", lede:"One map to decide better: well-rated places, practical information and real comments from fellow travellers.", locate:"Use my location", locationHint:"Find the closest recommendation to you.", all:"All", museum:"Museums", coffee:"Coffee", food:"Chilean food", view:"Walks & views", stay:"Hotels", useful:"Useful", market:"Markets", shop:"Shopping", experience:"Experiences", growshop:"Grow shops", search:"Search by name or district…", selected:"selected places", google:"Photos, reviews & directions on Google Maps", neighborhood:"Neighborhood", time:"Suggested time", languages:"Languages / information", googleRating:"Google reference", community:"SOS community", opinions:"Traveller reviews", noOpinions:"No reviews yet. Be the first to share what it was like.", write:"Share your experience", name:"Your name", comment:"What should another traveller know?", send:"Post review", sending:"Posting…", success:"Thank you! Your review is now live.", choose:"Choose a rating", source:"Google Maps references and ratings reviewed on September 23, 2026 and may change. Displayed images come from credited official sources. Confirm hours, languages and fares before leaving.", mapHelp:"Tap a marker or card to see full details.", detail:"Place information", reviewsCount:"reviews", official:"Official site", error:"We could not load reviews right now.", footer:"Your local co-pilot, city by city." },
  pt:{ city:"Santiago, Chile", eyebrow:"SANTIAGO, BEM SELECIONADA", title:"Lugares que valem a pena", lede:"Um só mapa para decidir melhor: lugares bem avaliados, informações práticas e opiniões reais de viajantes.", locate:"Usar minha localização", locationHint:"Encontre a recomendação mais próxima.", all:"Todos", museum:"Museus", coffee:"Cafeterias", food:"Comida chilena", view:"Passeios e vistas", stay:"Hotéis", useful:"Úteis", market:"Mercados", shop:"Compras", experience:"Experiências", growshop:"Growshops", search:"Buscar por nome ou bairro…", selected:"lugares selecionados", google:"Fotos, avaliações e rota no Google Maps", neighborhood:"Bairro", time:"Tempo sugerido", languages:"Idiomas / informação", googleRating:"Referência Google", community:"Comunidade SOS", opinions:"Opiniões de viajantes", noOpinions:"Ainda não há opiniões. Seja a primeira pessoa a contar como foi.", write:"Compartilhe sua experiência", name:"Seu nome", comment:"O que outro viajante deveria saber?", send:"Publicar opinião", sending:"Publicando…", success:"Obrigado! Sua opinião já foi publicada.", choose:"Escolha uma avaliação", source:"Referências e avaliações do Google Maps revisadas em 23 de setembro de 2026; podem mudar. As imagens são de fontes oficiais creditadas. Confirme horários, idiomas e tarifas.", mapHelp:"Toque em um marcador ou ficha para ver todos os detalhes.", detail:"Informações do lugar", reviewsCount:"opiniões", official:"Site oficial", error:"Não foi possível carregar as opiniões agora.", footer:"Seu copiloto local, cidade por cidade." },
  fr:{ city:"Santiago, Chili", eyebrow:"SANTIAGO, BIEN CHOISI", title:"Les lieux qui valent le détour", lede:"Une seule carte pour mieux choisir : lieux bien notés, informations pratiques et avis de voyageurs.", locate:"Utiliser ma position", locationHint:"Trouvez la recommandation la plus proche.", all:"Tous", museum:"Musées", coffee:"Cafés", food:"Cuisine chilienne", view:"Balades et vues", stay:"Hôtels", useful:"Pratique", market:"Marchés", shop:"Shopping", experience:"Expériences", growshop:"Growshops", search:"Rechercher par nom ou quartier…", selected:"lieux sélectionnés", google:"Photos, avis et itinéraire sur Google Maps", neighborhood:"Quartier", time:"Durée suggérée", languages:"Langues / information", googleRating:"Référence Google", community:"Communauté SOS", opinions:"Avis des voyageurs", noOpinions:"Aucun avis pour le moment. Soyez la première personne à partager votre expérience.", write:"Partagez votre expérience", name:"Votre nom", comment:"Que devrait savoir un autre voyageur ?", send:"Publier l’avis", sending:"Publication…", success:"Merci ! Votre avis est maintenant publié.", choose:"Choisissez une note", source:"Références et notes Google Maps vérifiées le 23 septembre 2026 ; elles peuvent changer. Les images proviennent de sources officielles créditées. Vérifiez horaires, langues et tarifs.", mapHelp:"Touchez un marqueur ou une fiche pour voir tous les détails.", detail:"Informations sur le lieu", reviewsCount:"avis", official:"Site officiel", error:"Impossible de charger les avis pour le moment.", footer:"Votre copilote local, ville après ville." },
};

const colors:Record<Category,string> = { museum:"#ff573d", coffee:"#9a5b2b", food:"#ed7a25", view:"#168c74", stay:"#7655c7", useful:"#2468b4", market:"#c44c7a", shop:"#0089a7", experience:"#6d7b24", growshop:"#2e8b57" };
const categories:Category[] = ["museum","coffee","food","view","stay","market","shop","experience","growshop","useful"];

function mapsUrl(place:Place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapQuery??`${place.name} Santiago Chile`)}`;
}

export default function MapExplorer() {
  const [locale,setLocale]=useState<Locale>(()=>{
    if(typeof window==="undefined") return "es";
    const saved=localStorage.getItem("sos-language") as Locale|null;
    return saved&&copy[saved]?saved:"es";
  });
  const [category,setCategory]=useState<"all"|Category>("all");
  const [query,setQuery]=useState("");
  const [selectedId,setSelectedId]=useState("precolombino");
  const [mapReady,setMapReady]=useState(false);
  const [locationStatus,setLocationStatus]=useState("");
  const [reviews,setReviews]=useState<Review[]>([]);
  const [summary,setSummary]=useState<ReviewSummary>({count:0,average:null});
  const [reviewsError,setReviewsError]=useState(false);
  const [rating,setRating]=useState(5);
  const [formStatus,setFormStatus]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const mapNode=useRef<HTMLDivElement>(null);
  const leafletRef=useRef<any>(null);
  const mapRef=useRef<any>(null);
  const markersRef=useRef<any[]>([]);
  const userMarkerRef=useRef<any>(null);
  const detailRef=useRef<HTMLElement>(null);
  const t=copy[locale];
  const shown=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase(locale);
    return places.filter((place)=>(category==="all"||place.category===category)&&(!needle||`${place.name} ${place.neighborhood}`.toLocaleLowerCase(locale).includes(needle)));
  },[category,query,locale]);
  const selected=places.find((place)=>place.id===selectedId) ?? places[0];

  useEffect(()=>{ localStorage.setItem("sos-language",locale); document.documentElement.lang=locale; },[locale]);
  useEffect(()=>{ import("leaflet").then((module)=>{leafletRef.current=module.default;setMapReady(true)}).catch(()=>setMapReady(false)); },[]);

  useEffect(()=>{
    if(!mapReady||!mapNode.current||mapRef.current) return;
    const L=leafletRef.current;
    const map=L.map(mapNode.current,{zoomControl:false,scrollWheelZoom:false}).setView([-33.435,-70.65],12);
    L.control.zoom({position:"bottomleft"}).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(map);
    mapRef.current=map;
    return()=>{ map.remove(); mapRef.current=null; };
  },[mapReady]);

  useEffect(()=>{
    const map=mapRef.current,L=leafletRef.current; if(!map||!L) return;
    markersRef.current.forEach((marker)=>marker.remove());
    markersRef.current=shown.map((place)=>{
      const color=colors[place.category];
      const icon=L.divIcon({className:"sos-marker-shell",html:`<span class="sos-marker" style="--marker:${color}"><i></i></span>`,iconSize:[34,40],iconAnchor:[17,38]});
      const marker=L.marker(place.coords,{icon}).addTo(map).bindTooltip(place.name,{direction:"top",offset:[0,-30]});
      marker.on("click",()=>setSelectedId(place.id));
      return marker;
    });
    if(shown.length) map.fitBounds(L.latLngBounds(shown.map((place)=>place.coords)),{padding:[42,42],maxZoom:14});
  },[shown,mapReady]);

  useEffect(()=>{
    const index=shown.findIndex((place)=>place.id===selectedId);
    if(index>=0&&mapRef.current&&markersRef.current[index]) {
      mapRef.current.flyTo(shown[index].coords,15,{duration:.65});
      markersRef.current[index].openTooltip();
    }
  },[selectedId,shown]);

  async function loadReviews(placeId:string) {
    setReviewsError(false);
    try {
      const response=await fetch(`/api/reviews?placeId=${encodeURIComponent(placeId)}`,{cache:"no-store"});
      if(!response.ok) throw new Error();
      const data=await response.json() as { reviews?:Review[]; summary?:ReviewSummary }; setReviews(data.reviews??[]); setSummary(data.summary??{count:0,average:null});
    } catch { setReviews([]); setSummary({count:0,average:null}); setReviewsError(true); }
  }
  useEffect(()=>{ loadReviews(selected.id); },[selected.id]);

  function selectPlace(place:Place) {
    setFormStatus("");
    setSelectedId(place.id);
    if(window.innerWidth<980) setTimeout(()=>detailRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
  }

  function locate() {
    if(!navigator.geolocation) { setLocationStatus("Tu navegador no permite usar la ubicación."); return; }
    setLocationStatus("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition((position)=>{
      const L=leafletRef.current,map=mapRef.current,here:[number,number]=[position.coords.latitude,position.coords.longitude];
      const nearest=places.reduce((best,place)=>Math.hypot(place.coords[0]-here[0],place.coords[1]-here[1])<Math.hypot(best.coords[0]-here[0],best.coords[1]-here[1])?place:best,places[0]);
      if(userMarkerRef.current) userMarkerRef.current.remove();
      userMarkerRef.current=L.circleMarker(here,{radius:8,color:"#081a36",fillColor:"#ffd21f",fillOpacity:1,weight:4}).addTo(map);
      map.fitBounds(L.latLngBounds([here,nearest.coords]),{padding:[60,60],maxZoom:14});
      setCategory("all"); setSelectedId(nearest.id); setLocationStatus(`${nearest.name} está cerca de ti.`);
    },()=>setLocationStatus("No pudimos acceder a tu ubicación. Revisa el permiso del navegador."),{enableHighAccuracy:true,timeout:10000});
  }

  async function submitReview(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setFormStatus("");
    const form=new FormData(event.currentTarget);
    const payload={placeId:selected.id,authorName:form.get("authorName"),comment:form.get("comment"),website:form.get("website"),rating};
    try {
      const response=await fetch("/api/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json() as { error?:string }; if(!response.ok) throw new Error(data.error||"Error");
      event.currentTarget.reset(); setRating(5); setFormStatus(t.success); await loadReviews(selected.id);
    } catch(error) { setFormStatus(error instanceof Error?error.message:t.error); }
    finally { setSubmitting(false); }
  }

  return <>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="SOS Travellers inicio">
        <img src="/assets/sos-logo-v2.png" alt="SOS Travellers · Just Enjoy" />
      </a>
      <div className="top-actions"><span className="city">● {t.city}</span><select aria-label="Cambiar idioma" value={locale} onChange={(e)=>setLocale(e.target.value as Locale)}><option value="es">ES · Español</option><option value="en">EN · English</option><option value="pt">PT · Português</option><option value="fr">FR · Français</option></select></div>
    </header>

    <main id="top">
      <section className="map-hero">
        <div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="lede">{t.lede}</p></div>
        <div className="locate-box"><button type="button" onClick={locate}><span>⌖</span>{t.locate}</button><p role="status">{locationStatus||t.locationHint}</p></div>
      </section>

      <section className="explorer" aria-label={t.title}>
        <div className="filters" role="group" aria-label="Filtrar lugares">
          <button className={category==="all"?"active":""} onClick={()=>setCategory("all")}>{t.all}</button>
          {categories.map((cat)=><button key={cat} className={category===cat?"active":""} onClick={()=>setCategory(cat)}>{t[cat]}</button>)}
        </div>
        <label className="place-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={t.search} aria-label={t.search}/></label>
        <div className="explorer-grid">
          <div className="map-column">
            <div className="map-wrap">
              <div className="map-count"><b>{shown.length}</b> {t.selected}</div>
              <div ref={mapNode} className="places-map" aria-label="Mapa de lugares recomendados en Santiago" />
              {!mapReady&&<div className="map-loading">Cargando mapa…</div>}
            </div>
            <p className="map-help">{t.mapHelp}</p>
            <div className="cards" aria-live="polite">
              {shown.map((place)=><button type="button" key={place.id} className={`place-card ${selected.id===place.id?"selected":""}`} onClick={()=>selectPlace(place)}>
                <span className="category-dot" style={{background:colors[place.category]}} />
                <span className="place-card-copy"><small>{place.neighborhood}</small><strong>{place.name}</strong><span>{place.summary[locale]}</span></span>
                <b className="rating">{/^\d/.test(place.rating)?`★ ${place.rating}`:place.rating}</b>
              </button>)}
            </div>
          </div>

          <aside className="detail-panel" ref={detailRef} aria-label={t.detail}>
            <div className="detail-accent" style={{background:colors[selected.category]}} />
            {selected.photo&&<figure className="detail-photo"><img src={selected.photo.src} alt={selected.photo.alt}/><figcaption>© <a href={selected.photo.url} target="_blank" rel="noreferrer">{selected.photo.credit}</a></figcaption></figure>}
            <div className="detail-head"><p>{t[selected.category]}</p><h2>{selected.name}</h2><span className="google-score">{/^\d/.test(selected.rating)?`★ ${selected.rating}${selected.reviews?` · ${selected.reviews}`:""}`:selected.rating}</span></div>
            <p className="detail-summary">{selected.summary[locale]}</p>
            {selected.languages&&<div className="language-row"><b>{t.languages}</b>{selected.languages.map((language)=><span key={language}>{language}</span>)}</div>}
            <dl className="facts"><div><dt>{t.neighborhood}</dt><dd>{selected.neighborhood}</dd></div><div><dt>{t.time}</dt><dd>{selected.visit}</dd></div><div><dt>{t.googleRating}</dt><dd>{selected.rating}</dd></div><div><dt>{t.community}</dt><dd>{summary.average?`★ ${summary.average} · ${summary.count} ${t.reviewsCount}`:`—`}</dd></div></dl>
            <a className="maps-link" href={mapsUrl(selected)} target="_blank" rel="noreferrer">{t.google}<span>↗</span></a>
            {selected.officialUrl&&<a className="official-link" href={selected.officialUrl} target="_blank" rel="noreferrer">{t.official}<span>↗</span></a>}

            <section className="reviews-section">
              <h3>{t.opinions}</h3>
              {reviewsError?<p className="empty">{t.error}</p>:reviews.length===0?<p className="empty">{t.noOpinions}</p>:<div className="review-list">{reviews.map((review)=><article key={review.id}><div><b>{review.author_name}</b><span>{"★".repeat(review.rating)}<i>{"★".repeat(5-review.rating)}</i></span></div><p>{review.comment}</p><time>{new Intl.DateTimeFormat(locale,{dateStyle:"medium"}).format(new Date(`${review.created_at}Z`))}</time></article>)}</div>}
            </section>

            <form className="review-form" onSubmit={submitReview}>
              <h3>{t.write}</h3>
              <div className="stars" role="radiogroup" aria-label={t.choose}>{[1,2,3,4,5].map((star)=><button key={star} type="button" role="radio" aria-checked={rating===star} aria-label={`${star} estrellas`} className={star<=rating?"on":""} onClick={()=>setRating(star)}>★</button>)}</div>
              <label>{t.name}<input name="authorName" minLength={2} maxLength={40} required autoComplete="name" /></label>
              <label>{t.comment}<textarea name="comment" minLength={5} maxLength={400} required rows={4} /></label>
              <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              <button className="submit" type="submit" disabled={submitting}>{submitting?t.sending:t.send}</button>
              {formStatus&&<p className="form-status" role="status">{formStatus}</p>}
            </form>
          </aside>
        </div>
        <p className="source">{t.source}</p>
      </section>
    </main>
    <footer><div className="footer-brand"><img src="/assets/sos-logo-v2.png" alt="SOS Travellers · Just Enjoy"/><p><small>{t.footer}</small></p></div><a href="https://www.nuevopudahuel.cl/transporte-oficial" target="_blank" rel="noreferrer">{t.official} ↗</a></footer>
  </>;
}
