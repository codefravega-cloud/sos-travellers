/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Category, Locale, Place } from "./places";
import { usePlaces } from "./use-places";
import CurrencyConverter from "./currency-converter";
import WeatherBackdrop from "./weather-backdrop";
import TripPlanner from "./trip-planner";
import SafetyHub from "./safety-hub";
import BusinessSignup from "./business-signup";
import TransportGuide from "./transport-guide";
import { currencyOptions } from "./travel-money";
import TravellerWelcome, { TravellerProfile } from "./traveller-welcome";
import ConnectivityGuide from "./connectivity-guide";
import PersonalizedRecommendations from "./personalized-recommendations";
import ChileHero from "./chile-hero";
import { RegionId, regionById, regions } from "./chile-regions";
import { openLabel, openStatus } from "./open-status";

type Review = { id:number; author_name:string; rating:number; comment:string; created_at:string };
type ReviewSummary = { count:number; average:number | null };
type UserLocation = { coords:[number,number]; accuracy:number; nearest:Place|null; distanceKm:number };
type PendingLocation = { coords:[number,number]; accuracy:number; manual:boolean };

const locationCopy:Record<Locale,{locating:string; here:string; nearest:string; accuracy:string; recenter:string; denied:string; unavailable:string;timeout:string;positionUnavailable:string;manual:string;manualHint:string;manualSet:string}> = {
  es:{locating:"Buscando tu ubicación actual… Acepta el permiso del teléfono.",here:"Tu ubicación actual",nearest:"Más cerca",accuracy:"Precisión",recenter:"Volver a mi ubicación",denied:"La ubicación está bloqueada. iPhone: Ajustes › Privacidad y seguridad › Localización › Safari. Android: toca el candado del navegador › Permisos › Ubicación. También puedes usar “Marcar en el mapa”.",unavailable:"Este navegador no puede usar tu ubicación. Abre la página con HTTPS en Safari o Chrome, o marca tu punto en el mapa.",timeout:"El teléfono tardó demasiado en responder. Activa GPS/Ubicación, sal al exterior y vuelve a intentarlo; también puedes marcar tu punto.",positionUnavailable:"No pudimos obtener señal de ubicación. Activa GPS/Ubicación y Wi-Fi o marca tu punto en el mapa.",manual:"Marcar en el mapa",manualHint:"Toca el mapa en el punto donde estás. No necesitas dar permiso al teléfono.",manualSet:"Ubicación aproximada marcada"},
  en:{locating:"Finding your current location… Accept the phone permission.",here:"Your current location",nearest:"Nearest place",accuracy:"Accuracy",recenter:"Return to my location",denied:"Location is blocked. iPhone: Settings › Privacy & Security › Location Services › Safari. Android: tap the browser lock › Permissions › Location. You can also use “Mark on map”.",unavailable:"This browser cannot use your location. Open the HTTPS page in Safari or Chrome, or mark your point on the map.",timeout:"Your phone took too long to respond. Enable GPS/Location, step outside and try again, or mark your point.",positionUnavailable:"We could not get a location signal. Enable GPS/Location and Wi-Fi, or mark your point on the map.",manual:"Mark on map",manualHint:"Tap the map where you are. No phone permission is needed.",manualSet:"Approximate location marked"},
  pt:{locating:"Buscando sua localização atual… Aceite a permissão do telefone.",here:"Sua localização atual",nearest:"Mais próximo",accuracy:"Precisão",recenter:"Voltar à minha localização",denied:"A localização está bloqueada. iPhone: Ajustes › Privacidade e Segurança › Serviços de Localização › Safari. Android: toque no cadeado › Permissões › Localização. Você também pode marcar no mapa.",unavailable:"Este navegador não pode usar sua localização. Abra a página HTTPS no Safari ou Chrome, ou marque seu ponto.",timeout:"O telefone demorou para responder. Ative GPS/Localização, vá para uma área aberta e tente novamente, ou marque seu ponto.",positionUnavailable:"Não foi possível obter sinal. Ative GPS/Localização e Wi-Fi, ou marque seu ponto no mapa.",manual:"Marcar no mapa",manualHint:"Toque no mapa onde você está. Não precisa dar permissão ao telefone.",manualSet:"Localização aproximada marcada"},
  fr:{locating:"Recherche de votre position… Acceptez l’autorisation du téléphone.",here:"Votre position actuelle",nearest:"Le plus proche",accuracy:"Précision",recenter:"Revenir à ma position",denied:"La position est bloquée. iPhone : Réglages › Confidentialité et sécurité › Service de localisation › Safari. Android : cadenas du navigateur › Autorisations › Position. Vous pouvez aussi marquer la carte.",unavailable:"Ce navigateur ne peut pas utiliser votre position. Ouvrez la page HTTPS dans Safari ou Chrome, ou marquez votre position.",timeout:"Le téléphone a mis trop de temps à répondre. Activez le GPS, sortez à l’extérieur et réessayez, ou marquez votre position.",positionUnavailable:"Signal de position indisponible. Activez le GPS et le Wi-Fi, ou marquez votre position sur la carte.",manual:"Marquer sur la carte",manualHint:"Touchez la carte à votre position. Aucune autorisation du téléphone requise.",manualSet:"Position approximative marquée"},
};

const actionCopy:Record<Locale,{plan:string;transport:string;map:string;sos:string;business:string;practical:string;directions:string;walk:string;transit:string;drive:string;save:string;saved:string;currency:string}>={
  es:{plan:"Planificar",transport:"Precios transporte",map:"Mapa",sos:"SOS",business:"Negocios",practical:"Ficha práctica",directions:"Cómo llegar",walk:"Caminando",transit:"Transporte público",drive:"En auto",save:"Guardar en mi viaje",saved:"Guardado en mi viaje",currency:"Moneda"},
  en:{plan:"Plan",transport:"Transport prices",map:"Map",sos:"SOS",business:"Businesses",practical:"Practical details",directions:"Get there",walk:"Walking",transit:"Public transport",drive:"Driving",save:"Save to my trip",saved:"Saved to my trip",currency:"Currency"},
  pt:{plan:"Planejar",transport:"Preços transporte",map:"Mapa",sos:"SOS",business:"Negócios",practical:"Ficha prática",directions:"Como chegar",walk:"Caminhando",transit:"Transporte público",drive:"De carro",save:"Salvar na viagem",saved:"Salvo na viagem",currency:"Moeda"},
  fr:{plan:"Planifier",transport:"Prix transport",map:"Carte",sos:"SOS",business:"Entreprises",practical:"Infos pratiques",directions:"S’y rendre",walk:"À pied",transit:"Transport public",drive:"En voiture",save:"Enregistrer",saved:"Enregistré",currency:"Devise"},
};

const extraCopy:Record<Locale,Record<"park"|"themed"|"winery"|"snow"|"nightlife"|"hours"|"access",string>>={
  es:{park:"Parques",themed:"Locales temáticos",winery:"Viñas",snow:"Nieve",nightlife:"Discotecas",hours:"Horario",access:"Acceso / valor"},
  en:{park:"Parks",themed:"Themed venues",winery:"Wineries",snow:"Snow",nightlife:"Nightlife",hours:"Hours",access:"Entry / price"},
  pt:{park:"Parques",themed:"Locais temáticos",winery:"Vinícolas",snow:"Neve",nightlife:"Discotecas",hours:"Horário",access:"Acesso / valor"},
  fr:{park:"Parcs",themed:"Lieux à thème",winery:"Vignobles",snow:"Neige",nightlife:"Discothèques",hours:"Horaires",access:"Accès / tarif"},
};

const copy = {
  es:{ city:"Santiago, Chile", eyebrow:"SANTIAGO, BIEN SELECCIONADO", title:"Lugares que sí suman", lede:"Un solo mapa para decidir mejor: lugares bien valorados, información práctica y opiniones reales de otros viajeros.", locate:"Usar mi ubicación", locationHint:"Encuentra qué recomendación está más cerca de ti.", all:"Todos", museum:"Museos", coffee:"Cafeterías", food:"Comida chilena", view:"Paseos y vistas", stay:"Hoteles", useful:"Útiles", market:"Mercados", shop:"Compras", experience:"Experiencias", growshop:"Growshops", search:"Buscar por nombre o comuna…", selected:"lugares seleccionados", google:"Fotos, reseñas y ruta en Google Maps", neighborhood:"Barrio", time:"Tiempo sugerido", languages:"Idiomas / información", googleRating:"Referencia Google", community:"Opinión SOS", opinions:"Opiniones de viajeros", noOpinions:"Todavía no hay opiniones. Sé la primera persona en contar cómo fue.", write:"Comparte tu experiencia", name:"Tu nombre", comment:"¿Qué debería saber otro viajero?", send:"Publicar opinión", sending:"Publicando…", success:"¡Gracias! Tu opinión ya está publicada.", choose:"Selecciona una calificación", source:"Referencias y valoraciones de Google Maps revisadas el 23 de septiembre de 2026; pueden cambiar. Las imágenes mostradas provienen de fuentes oficiales acreditadas. Verifica horarios, idiomas y tarifas antes de salir.", mapHelp:"Toca un marcador o una ficha para ver todos los detalles.", detail:"Información del lugar", reviewsCount:"opiniones", official:"Sitio oficial", error:"No pudimos cargar las opiniones ahora.", footer:"Tu copiloto local, ciudad por ciudad." },
  en:{ city:"Santiago, Chile", eyebrow:"SANTIAGO, WELL CHOSEN", title:"Places worth your time", lede:"One map to decide better: well-rated places, practical information and real comments from fellow travellers.", locate:"Use my location", locationHint:"Find the closest recommendation to you.", all:"All", museum:"Museums", coffee:"Coffee", food:"Chilean food", view:"Walks & views", stay:"Hotels", useful:"Useful", market:"Markets", shop:"Shopping", experience:"Experiences", growshop:"Grow shops", search:"Search by name or district…", selected:"selected places", google:"Photos, reviews & directions on Google Maps", neighborhood:"Neighborhood", time:"Suggested time", languages:"Languages / information", googleRating:"Google reference", community:"SOS community", opinions:"Traveller reviews", noOpinions:"No reviews yet. Be the first to share what it was like.", write:"Share your experience", name:"Your name", comment:"What should another traveller know?", send:"Post review", sending:"Posting…", success:"Thank you! Your review is now live.", choose:"Choose a rating", source:"Google Maps references and ratings reviewed on September 23, 2026 and may change. Displayed images come from credited official sources. Confirm hours, languages and fares before leaving.", mapHelp:"Tap a marker or card to see full details.", detail:"Place information", reviewsCount:"reviews", official:"Official site", error:"We could not load reviews right now.", footer:"Your local co-pilot, city by city." },
  pt:{ city:"Santiago, Chile", eyebrow:"SANTIAGO, BEM SELECIONADA", title:"Lugares que valem a pena", lede:"Um só mapa para decidir melhor: lugares bem avaliados, informações práticas e opiniões reais de viajantes.", locate:"Usar minha localização", locationHint:"Encontre a recomendação mais próxima.", all:"Todos", museum:"Museus", coffee:"Cafeterias", food:"Comida chilena", view:"Passeios e vistas", stay:"Hotéis", useful:"Úteis", market:"Mercados", shop:"Compras", experience:"Experiências", growshop:"Growshops", search:"Buscar por nome ou bairro…", selected:"lugares selecionados", google:"Fotos, avaliações e rota no Google Maps", neighborhood:"Bairro", time:"Tempo sugerido", languages:"Idiomas / informação", googleRating:"Referência Google", community:"Comunidade SOS", opinions:"Opiniões de viajantes", noOpinions:"Ainda não há opiniões. Seja a primeira pessoa a contar como foi.", write:"Compartilhe sua experiência", name:"Seu nome", comment:"O que outro viajante deveria saber?", send:"Publicar opinião", sending:"Publicando…", success:"Obrigado! Sua opinião já foi publicada.", choose:"Escolha uma avaliação", source:"Referências e avaliações do Google Maps revisadas em 23 de setembro de 2026; podem mudar. As imagens são de fontes oficiais creditadas. Confirme horários, idiomas e tarifas.", mapHelp:"Toque em um marcador ou ficha para ver todos os detalhes.", detail:"Informações do lugar", reviewsCount:"opiniões", official:"Site oficial", error:"Não foi possível carregar as opiniões agora.", footer:"Seu copiloto local, cidade por cidade." },
  fr:{ city:"Santiago, Chili", eyebrow:"SANTIAGO, BIEN CHOISI", title:"Les lieux qui valent le détour", lede:"Une seule carte pour mieux choisir : lieux bien notés, informations pratiques et avis de voyageurs.", locate:"Utiliser ma position", locationHint:"Trouvez la recommandation la plus proche.", all:"Tous", museum:"Musées", coffee:"Cafés", food:"Cuisine chilienne", view:"Balades et vues", stay:"Hôtels", useful:"Pratique", market:"Marchés", shop:"Shopping", experience:"Expériences", growshop:"Growshops", search:"Rechercher par nom ou quartier…", selected:"lieux sélectionnés", google:"Photos, avis et itinéraire sur Google Maps", neighborhood:"Quartier", time:"Durée suggérée", languages:"Langues / information", googleRating:"Référence Google", community:"Communauté SOS", opinions:"Avis des voyageurs", noOpinions:"Aucun avis pour le moment. Soyez la première personne à partager votre expérience.", write:"Partagez votre expérience", name:"Votre nom", comment:"Que devrait savoir un autre voyageur ?", send:"Publier l’avis", sending:"Publication…", success:"Merci ! Votre avis est maintenant publié.", choose:"Choisissez une note", source:"Références et notes Google Maps vérifiées le 23 septembre 2026 ; elles peuvent changer. Les images proviennent de sources officielles créditées. Vérifiez horaires, langues et tarifs.", mapHelp:"Touchez un marqueur ou une fiche pour voir tous les détails.", detail:"Informations sur le lieu", reviewsCount:"avis", official:"Site officiel", error:"Impossible de charger les avis pour le moment.", footer:"Votre copilote local, ville après ville." },
};

const openMapsCopy:Record<Locale,string>={
  es:"Abrir en Google Maps",
  en:"Open in Google Maps",
  pt:"Abrir no Google Maps",
  fr:"Ouvrir dans Google Maps",
};
const addressCopy:Record<Locale,string>={es:"Dirección",en:"Address",pt:"Endereço",fr:"Adresse"};

const landingCopy:Record<Locale,{free:string;freeTitle:string;freeLede:string;freeCount:string;seeAll:string;plan:string;now:string;sos:string;verified:string}>={
  es:{free:"Gratis",freeTitle:"Santiago sin gastar",freeLede:"Parques, miradores, museos y paseos de acceso gratuito, con dirección, horario y datos prácticos antes de salir.",freeCount:"panoramas gratuitos identificados",seeAll:"Ver todos en el mapa",plan:"Planificar mi viaje",now:"Qué hacer ahora",sos:"Necesito ayuda",verified:"Acceso gratuito identificado"},
  en:{free:"Free",freeTitle:"Enjoy Santiago for free",freeLede:"Free parks, viewpoints, museums and walks with addresses, opening information and practical details.",freeCount:"free activities identified",seeAll:"See all on the map",plan:"Plan my trip",now:"What to do now",sos:"I need help",verified:"Free access identified"},
  pt:{free:"Grátis",freeTitle:"Santiago sem gastar",freeLede:"Parques, mirantes, museus e passeios gratuitos, com endereço, horário e informações práticas.",freeCount:"passeios gratuitos identificados",seeAll:"Ver todos no mapa",plan:"Planejar minha viagem",now:"O que fazer agora",sos:"Preciso de ajuda",verified:"Acesso gratuito identificado"},
  fr:{free:"Gratuit",freeTitle:"Santiago sans dépenser",freeLede:"Parcs, belvédères, musées et promenades gratuits avec adresse, horaires et informations pratiques.",freeCount:"activités gratuites identifiées",seeAll:"Tout voir sur la carte",plan:"Planifier mon voyage",now:"Que faire maintenant",sos:"J’ai besoin d’aide",verified:"Accès gratuit identifié"},
};

const colors:Record<Category,string> = { museum:"#ff573d", coffee:"#9a5b2b", food:"#ed7a25", view:"#168c74", stay:"#7655c7", useful:"#2468b4", market:"#c44c7a", shop:"#0089a7", experience:"#6d7b24", growshop:"#2e8b57", park:"#2f9b62", themed:"#a148a9", winery:"#7c2d55", snow:"#3893c7", nightlife:"#283593" };
const categories:Category[] = ["museum","coffee","food","themed","park","view","stay","winery","snow","nightlife","market","shop","experience","growshop","useful"];

function mapsUrl(place:Place) {
  if(place.googleMapsUrl) return place.googleMapsUrl;
  const query=place.mapQuery??`${place.name}, ${place.address??place.neighborhood}, Chile`;
  const placeId=place.googlePlaceId?`&query_place_id=${encodeURIComponent(place.googlePlaceId)}`:"";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${placeId}`;
}

function directionsUrl(place:Place,mode:"walking"|"transit"|"driving") {
  const placeId=place.googlePlaceId?`&destination_place_id=${encodeURIComponent(place.googlePlaceId)}`:"";
  return `https://www.google.com/maps/dir/?api=1&destination=${place.coords[0]},${place.coords[1]}${placeId}&travelmode=${mode}`;
}

function distanceKm(a:[number,number],b:[number,number]) {
  const toRad=(value:number)=>value*Math.PI/180;
  const earth=6371;
  const dLat=toRad(b[0]-a[0]),dLon=toRad(b[1]-a[1]);
  const value=Math.sin(dLat/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLon/2)**2;
  return 2*earth*Math.asin(Math.sqrt(value));
}

function displayDistance(km:number) { return km<1?`${Math.max(1,Math.round(km*1000))} m`:`${km.toFixed(1)} km`; }

function isFreePlace(place:Place) {
  return place.rating==="GRATIS" || Boolean(place.access?.es.toLocaleLowerCase("es").includes("gratuit"));
}

const CARD_PAGE=60;
const regionCopy:Record<Locale,{empty:string;loading:string;imported:string;checked:string;more:string;curated:string;openNow:string;osm:string;osmCredit:string}>={
  es:{empty:"Aún no hay locales cargados para esta región. Estamos sumando destinos de todo Chile.",loading:"Cargando locales…",imported:"Local con nota 4,0 o más en Google Maps. Revisa fotos, horarios y opiniones actualizadas en su ficha.",checked:"Nota verificada el",more:"Mostrar más",curated:"Selección SOS",openNow:"Abiertos ahora",osm:"Local registrado en OpenStreetMap, aún sin nota. Si lo visitas, deja tu opinión para otros viajeros.",osmCredit:"Datos de locales © colaboradores de OpenStreetMap."},
  en:{empty:"No places loaded for this region yet. We are adding destinations across Chile.",loading:"Loading places…",imported:"Rated 4.0 or higher on Google Maps. Check current photos, hours and reviews on its listing.",checked:"Rating checked on",more:"Show more",curated:"SOS pick",openNow:"Open now",osm:"Listed on OpenStreetMap, not rated yet. If you visit, leave a review for other travellers.",osmCredit:"Place data © OpenStreetMap contributors."},
  pt:{empty:"Ainda não há lugares carregados para esta região. Estamos adicionando destinos de todo o Chile.",loading:"Carregando lugares…",imported:"Lugar com nota 4,0 ou mais no Google Maps. Veja fotos, horários e avaliações atualizadas na ficha.",checked:"Nota verificada em",more:"Mostrar mais",curated:"Seleção SOS",openNow:"Abertos agora",osm:"Local registrado no OpenStreetMap, ainda sem nota. Se você visitar, deixe sua opinião para outros viajantes.",osmCredit:"Dados de locais © colaboradores do OpenStreetMap."},
  fr:{empty:"Aucun lieu chargé pour cette région pour l'instant. Nous ajoutons des destinations dans tout le Chili.",loading:"Chargement des lieux…",imported:"Lieu noté 4,0 ou plus sur Google Maps. Consultez photos, horaires et avis à jour sur sa fiche.",checked:"Note vérifiée le",more:"Afficher plus",curated:"Sélection SOS",openNow:"Ouverts maintenant",osm:"Lieu répertorié sur OpenStreetMap, pas encore noté. Si vous y allez, laissez un avis pour les autres voyageurs.",osmCredit:"Données des lieux © contributeurs OpenStreetMap."},
};

export default function MapExplorer() {
  const [locale,setLocale]=useState<Locale>(()=>{
    if(typeof window==="undefined") return "es";
    const saved=localStorage.getItem("sos-language") as Locale|null;
    return saved&&copy[saved]?saved:"es";
  });
  const [category,setCategory]=useState<"all"|"free"|Category>("all");
  const [query,setQuery]=useState("");
  const [selectedId,setSelectedId]=useState("precolombino");
  const [mapReady,setMapReady]=useState(false);
  const [locationStatus,setLocationStatus]=useState("");
  const [locating,setLocating]=useState(false);
  const [userLocation,setUserLocation]=useState<UserLocation|null>(null);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [summary,setSummary]=useState<ReviewSummary>({count:0,average:null});
  const [reviewsError,setReviewsError]=useState(false);
  const [rating,setRating]=useState(5);
  const [formStatus,setFormStatus]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [favoriteIds,setFavoriteIds]=useState<string[]>([]);
  const [displayCurrency,setDisplayCurrency]=useState(()=>typeof window==="undefined"?"CLP":localStorage.getItem("sos-currency")??"CLP");
  const [manualPicking,setManualPicking]=useState(false);
  const [travellerProfile,setTravellerProfile]=useState<TravellerProfile|null>(null);
  const [region,setRegion]=useState<RegionId|null>(null);
  const activeRegion:RegionId=region??"RM";
  const {places,loading:placesLoading}=usePlaces(activeRegion);
  const [cardLimit,setCardLimit]=useState({key:"",count:CARD_PAGE});
  const [openOnly,setOpenOnly]=useState(false);
  const [now,setNow]=useState(()=>new Date());
  const mapNode=useRef<HTMLDivElement>(null);
  const leafletRef=useRef<any>(null);
  const mapRef=useRef<any>(null);
  const markersRef=useRef<any[]>([]);
  const clusterRef=useRef<any>(null);
  const placesRef=useRef<Place[]>(places);
  const regionRef=useRef<RegionId>(activeRegion);
  const relocateRef=useRef<PendingLocation|null>(null);
  const userMarkerRef=useRef<any>(null);
  const userAccuracyRef=useRef<any>(null);
  const watchIdRef=useRef<number|null>(null);
  const pendingLocationRef=useRef<PendingLocation|null>(null);
  const detailRef=useRef<HTMLElement>(null);
  const t=copy[locale],lt=locationCopy[locale],xt=extraCopy[locale],at=actionCopy[locale],landing=landingCopy[locale],rt=regionCopy[locale];
  const freePlaces=useMemo(()=>places.filter(isFreePlace),[places]);
  const categoryName=(value:Category)=>(value in xt?xt[value as keyof typeof xt]:(t as unknown as Record<string,string>)[value]);
  // Only the "open now" filter makes the list depend on the clock.
  const openClock=openOnly?now:null;
  const shown=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase(locale);
    return places
      .filter((place)=>(category==="all"||(category==="free"?isFreePlace(place):place.category===category))&&(!needle||`${place.name} ${place.neighborhood} ${place.address??""}`.toLocaleLowerCase(locale).includes(needle))&&(!openClock||openStatus(place,openClock).state==="open"))
      .sort((a,b)=>category==="all"?Number(isFreePlace(b))-Number(isFreePlace(a)):0);
  },[places,category,query,locale,openClock]);
  const selected:Place|undefined=places.find((place)=>place.id===selectedId) ?? shown[0] ?? places[0];
  const cardKey=`${activeRegion}|${category}|${query}|${openOnly}`;
  const cardCount=cardLimit.key===cardKey?cardLimit.count:CARD_PAGE;
  useEffect(()=>{ placesRef.current=places; regionRef.current=activeRegion; },[places,activeRegion]);

  useEffect(()=>{ localStorage.setItem("sos-language",locale); document.documentElement.lang=locale; },[locale]);
  useEffect(()=>{ localStorage.setItem("sos-currency",displayCurrency); },[displayCurrency]);
  useEffect(()=>{ try{setFavoriteIds(JSON.parse(localStorage.getItem("sos-favorites")??"[]"))}catch{setFavoriteIds([])} },[]);
  useEffect(()=>{ import("leaflet").then(async(module)=>{(window as any).L=module.default;await import("leaflet.markercluster");leafletRef.current=module.default;setMapReady(true)}).catch(()=>setMapReady(false)); },[]);
  useEffect(()=>{ const timer=setInterval(()=>setNow(new Date()),60000); return()=>clearInterval(timer); },[]);
  useEffect(()=>()=>{ if(watchIdRef.current!==null) navigator.geolocation?.clearWatch(watchIdRef.current); },[]);

  useEffect(()=>{
    if(!mapReady||!mapNode.current||mapRef.current) return;
    const L=leafletRef.current;
    const map=L.map(mapNode.current,{zoomControl:false,scrollWheelZoom:false}).setView([-33.435,-70.65],12);
    L.control.zoom({position:"bottomleft"}).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(map);
    clusterRef.current=L.markerClusterGroup({maxClusterRadius:46,disableClusteringAtZoom:15,showCoverageOnHover:false,iconCreateFunction:(group:any)=>L.divIcon({className:"sos-cluster",html:`<span>${group.getChildCount()}</span>`,iconSize:[40,40]})}).addTo(map);
    mapRef.current=map;
    const pending=pendingLocationRef.current;
    if(pending) setTimeout(()=>applyUserLocation(pending.coords,pending.accuracy,pending.manual),0);
    return()=>{ map.remove(); mapRef.current=null; clusterRef.current=null; };
  // applyUserLocation stores results safely until Leaflet is ready.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mapReady]);

  useEffect(()=>{
    const map=mapRef.current,L=leafletRef.current,cluster=clusterRef.current; if(!map||!L||!cluster) return;
    cluster.clearLayers();
    const at=new Date();
    markersRef.current=shown.map((place)=>{
      const color=colors[place.category],status=openStatus(place,at);
      const icon=L.divIcon({className:"sos-marker-shell",html:`<span class="sos-marker" style="--marker:${color}"><i></i></span>`,iconSize:[34,40],iconAnchor:[17,38]});
      const marker=L.marker(place.coords,{icon}).bindTooltip(status.state==="unknown"?place.name:`${place.name} · ${openLabel(status,locale)}`,{direction:"top",offset:[0,-30]});
      marker.on("click",()=>setSelectedId(place.id));
      return marker;
    });
    cluster.addLayers(markersRef.current);
    if(shown.length) map.fitBounds(L.latLngBounds(shown.map((place)=>place.coords)),{padding:[42,42],maxZoom:14});
    else { const {center,zoom}=regionById(activeRegion); map.setView(center,zoom); }
  },[shown,mapReady,activeRegion,locale]);

  useEffect(()=>{
    const index=shown.findIndex((place)=>place.id===selectedId);
    const marker=markersRef.current[index];
    if(index>=0&&clusterRef.current&&marker) clusterRef.current.zoomToShowLayer(marker,()=>marker.openTooltip());
  },[selectedId,shown]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!manualPicking) return;
    map.getContainer().classList.add("manual-location-mode");
    const handler=(event:any)=>{applyUserLocation([event.latlng.lat,event.latlng.lng],0,true);setManualPicking(false)};
    map.on("click",handler);
    return()=>{map.off("click",handler);map.getContainer().classList.remove("manual-location-mode")};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[manualPicking,mapReady]);

  async function loadReviews(placeId:string) {
    setReviewsError(false);
    try {
      const response=await fetch(`/api/reviews?placeId=${encodeURIComponent(placeId)}`,{cache:"no-store"});
      if(!response.ok) throw new Error();
      const data=await response.json() as { reviews?:Review[]; summary?:ReviewSummary }; setReviews(data.reviews??[]); setSummary(data.summary??{count:0,average:null});
    } catch { setReviews([]); setSummary({count:0,average:null}); setReviewsError(true); }
  }
  const selectedPlaceId=selected?.id;
  useEffect(()=>{ if(selectedPlaceId) loadReviews(selectedPlaceId); },[selectedPlaceId]);
  useEffect(()=>{
    const pending=relocateRef.current;
    if(pending&&!placesLoading){ relocateRef.current=null; applyUserLocation(pending.coords,pending.accuracy,pending.manual); }
  // Re-applies a location that arrived while its region's places were loading.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[places,placesLoading]);

  function selectPlace(place:Place) {
    setFormStatus("");
    setSelectedId(place.id);
    if(window.innerWidth<980) setTimeout(()=>detailRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
  }

  // A locality picked in the hero search narrows the list to that city or town.
  function changeRegion(next:RegionId|null,locality="") {
    setRegion(next);setCategory("all");setQuery(locality);
  }

  function exploreRegion(next:RegionId) {
    changeRegion(next);
    setTimeout(()=>document.getElementById("mapa")?.scrollIntoView({behavior:"smooth",block:"start"}),80);
  }

  function showFreePlaces() {
    setCategory("free");
    setQuery("");
    setTimeout(()=>document.getElementById("mapa")?.scrollIntoView({behavior:"smooth",block:"start"}),80);
  }

  function toggleFavorite(id:string){
    setFavoriteIds(current=>{
      const next=current.includes(id)?current.filter(item=>item!==id):[...current,id];
      localStorage.setItem("sos-favorites",JSON.stringify(next));
      return next;
    });
  }

  function centerOnUser(location=userLocation) {
    if(!location||!mapRef.current) return;
    mapRef.current.setView(location.coords,16,{animate:true});
    userMarkerRef.current?.openTooltip();
  }

  function applyUserLocation(here:[number,number],accuracy:number,manual=false) {
    // Watch callbacks outlive renders, so read the current region and places from refs.
    const home=regions.reduce((best,item)=>distanceKm(here,item.center)<distanceKm(here,best.center)?item:best);
    if(home.id!==regionRef.current&&distanceKm(here,home.center)<500){ relocateRef.current={coords:here,accuracy,manual};regionRef.current=home.id;changeRegion(home.id);return; }
    const pool=placesRef.current;
    const nearest=pool.length?pool.reduce((best,place)=>distanceKm(here,place.coords)<distanceKm(here,best.coords)?place:best):null;
    const next={coords:here,accuracy,nearest,distanceKm:nearest?distanceKm(here,nearest.coords):0};
    setUserLocation(next);setCategory("all");setLocating(false);
    if(nearest) setSelectedId(nearest.id);
    setLocationStatus(nearest?`${manual?lt.manualSet:lt.nearest}: ${nearest.name} · ${displayDistance(next.distanceKm)}`:manual?lt.manualSet:lt.here);
    const L=leafletRef.current,map=mapRef.current;
    if(!L||!map){pendingLocationRef.current={coords:here,accuracy,manual};return}
    pendingLocationRef.current=null;
    userMarkerRef.current?.remove(); userAccuracyRef.current?.remove();
    if(accuracy>0) userAccuracyRef.current=L.circle(here,{radius:Math.max(accuracy,20),color:"#2468b4",fillColor:"#6aa9f4",fillOpacity:.12,weight:1}).addTo(map);
    userMarkerRef.current=L.circleMarker(here,{radius:10,color:"#081a36",fillColor:"#ffd21f",fillOpacity:1,weight:4}).addTo(map).bindTooltip(manual?lt.manualSet:lt.here,{permanent:true,direction:"top",offset:[0,-12],className:"user-location-label"});
    setTimeout(()=>nearest?map.fitBounds(L.latLngBounds([here,nearest.coords]),{padding:[70,70],maxZoom:15}):map.setView(here,13),120);
  }

  async function locate() {
    if(!window.isSecureContext||!navigator.geolocation) { setLocating(false);setLocationStatus(lt.unavailable); return; }
    setManualPicking(false);setLocating(true); setLocationStatus(lt.locating);
    if(watchIdRef.current!==null) navigator.geolocation.clearWatch(watchIdRef.current);
    try{const permission=await navigator.permissions?.query({name:"geolocation"});if(permission?.state==="denied"){setLocating(false);setLocationStatus(lt.denied);return}}catch{}
    navigator.geolocation.getCurrentPosition((position)=>{
      applyUserLocation([position.coords.latitude,position.coords.longitude],position.coords.accuracy);
      watchIdRef.current=navigator.geolocation.watchPosition(update=>applyUserLocation([update.coords.latitude,update.coords.longitude],update.coords.accuracy),()=>{}, {enableHighAccuracy:true,timeout:30000,maximumAge:15000});
    },(error)=>{
      setLocating(false);
      setLocationStatus(error.code===error.PERMISSION_DENIED?lt.denied:error.code===error.TIMEOUT?lt.timeout:lt.positionUnavailable);
    },{enableHighAccuracy:true,timeout:25000,maximumAge:300000});
  }

  async function submitReview(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!selected) return; setSubmitting(true); setFormStatus("");
    const form=new FormData(event.currentTarget);
    const payload={placeId:selected.id,authorName:form.get("authorName"),comment:form.get("comment"),website:form.get("website"),rating};
    try {
      const response=await fetch("/api/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json() as { error?:string }; if(!response.ok) throw new Error(data.error||"Error");
      event.currentTarget.reset(); setRating(5); setFormStatus(t.success); await loadReviews(selected.id);
    } catch(error) { setFormStatus(error instanceof Error?error.message:t.error); }
    finally { setSubmitting(false); }
  }

  // Cards stay quiet when a place has no hours; the detail panel says so explicitly.
  function badge(place:Place,detailed=false) {
    const status=openStatus(place,now);
    if(status.state==="unknown"&&!detailed) return null;
    return <em className={`open-badge is-${status.state}`}>{openLabel(status,locale,detailed)}</em>;
  }

  return <>
    <TravellerWelcome locale={locale} onLocaleChange={setLocale} currency={displayCurrency} onCurrencyChange={setDisplayCurrency} onProfile={setTravellerProfile}/>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="SOS Travellers inicio">
        <img src="/assets/sos-logo-v2.png" alt="SOS Travellers · Just Enjoy" />
      </a>
      <nav className="quick-nav" aria-label="Navegación"><a href="#planificar">{at.plan}</a><a href="#transporte">{at.transport}</a><a href="#mapa">{at.map}</a><a href="#sos">{at.sos}</a></nav>
      <div className="top-actions"><span className="city">● {regionById(activeRegion).name}, Chile</span><select aria-label="Cambiar idioma" value={locale} onChange={(e)=>setLocale(e.target.value as Locale)}><option value="es">ES · Español</option><option value="en">EN · English</option><option value="pt">PT · Português</option><option value="fr">FR · Français</option></select><select className="header-currency" aria-label={at.currency} value={displayCurrency} onChange={event=>setDisplayCurrency(event.target.value)}>{currencyOptions.map(([code])=><option key={code} value={code}>{code}</option>)}</select></div>
    </header>

    <main id="top">
      <ChileHero locale={locale} region={region} onRegionChange={changeRegion} onExplore={exploreRegion} weather={(zone)=><WeatherBackdrop locale={locale} region={activeRegion} zone={zone}/>}
        actions={<><a className="primary" href="#gratis">◉ {landing.now}</a><a href="#planificar">＋ {landing.plan}</a><a className="emergency" href="#sos">SOS · {landing.sos}</a></>}
        locateBox={<div className={`locate-box ${userLocation?"located":""}`}><button type="button" onClick={locate} disabled={locating}><span>{locating?"◌":"⌖"}</span>{locating?lt.locating:t.locate}</button><button className={`manual-location ${manualPicking?"active":""}`} type="button" onClick={()=>{setManualPicking(value=>!value);setLocationStatus(lt.manualHint)}}>＋ {lt.manual}</button><p role="status">{locationStatus||t.locationHint}</p></div>}/>

      <div className="page-body">
      {activeRegion==="RM"&&<section className="free-discovery" id="gratis">
        <div className="free-discovery-head"><div><p>{landing.free}</p><h2>{landing.freeTitle}</h2><span>{landing.freeLede}</span></div><strong>{freePlaces.length}<small>{landing.freeCount}</small></strong></div>
        <div className="free-place-grid">{freePlaces.slice(0,6).map(place=><button type="button" key={place.id} onClick={()=>{selectPlace(place);setCategory("free");setTimeout(()=>document.getElementById("mapa")?.scrollIntoView({behavior:"smooth"}),80)}}><i>✓</i><span><small>{place.neighborhood}</small><b>{place.name}</b><em>{place.tag?.[locale]??landing.verified}</em>{badge(place)}</span><strong>{landing.free}</strong></button>)}</div>
        <button className="show-all-free" type="button" onClick={showFreePlaces}>{landing.seeAll} <span>→</span></button>
      </section>}

      <PersonalizedRecommendations locale={locale} profile={travellerProfile} places={places} now={now} onSelectPlace={selectPlace}/>

      <CurrencyConverter locale={locale} selectedCurrency={displayCurrency} onCurrencyChange={setDisplayCurrency}/>

      <TripPlanner locale={locale} places={places} now={now} showRoutes={activeRegion==="RM"} favoriteIds={favoriteIds} onSelectPlace={selectPlace} onToggleFavorite={toggleFavorite} currency={displayCurrency} onCurrencyChange={setDisplayCurrency}/>
      {activeRegion==="RM"&&<TransportGuide locale={locale} currency={displayCurrency} onCurrencyChange={setDisplayCurrency}/>}
      <ConnectivityGuide locale={locale} profile={travellerProfile}/>

      <section className="explorer" id="mapa" aria-label={t.title}>
        <div className="filters" role="group" aria-label="Filtrar lugares">
          <button className={category==="all"?"active":""} onClick={()=>setCategory("all")}>{t.all}</button>
          <button className={`free-filter ${category==="free"?"active":""}`} onClick={()=>setCategory("free")}>✓ {landing.free}</button>
          <button className={`open-filter ${openOnly?"active":""}`} aria-pressed={openOnly} onClick={()=>setOpenOnly(value=>!value)}>● {rt.openNow}</button>
          {categories.map((cat)=><button key={cat} className={category===cat?"active":""} onClick={()=>setCategory(cat)}>{categoryName(cat)}</button>)}
        </div>
        <label className="place-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={t.search} aria-label={t.search}/></label>
        <div className="explorer-grid">
          <div className="map-column">
            <div className="map-wrap">
              <div className="map-count"><b>{shown.length}</b> {t.selected}</div>
              {userLocation&&<div className="location-card"><div><strong><i/> {userLocation.accuracy?lt.here:lt.manualSet}</strong><small>{userLocation.coords[0].toFixed(4)}, {userLocation.coords[1].toFixed(4)}{userLocation.accuracy?` · ${lt.accuracy} ±${Math.round(userLocation.accuracy)} m`:""}</small><span>{lt.nearest}: <b>{userLocation.nearest?.name??"—"}</b>{userLocation.nearest?` · ${displayDistance(userLocation.distanceKm)}`:""}</span></div><button type="button" onClick={()=>centerOnUser()} aria-label={lt.recenter}>⌖</button></div>}
              <div ref={mapNode} className="places-map" aria-label="Mapa de lugares recomendados en Chile" />
              {!mapReady&&<div className="map-loading">Cargando mapa…</div>}
            </div>
            <p className="map-help">{t.mapHelp}</p>
            <div className="cards" aria-live="polite">
              {!shown.length&&<p className="region-empty" role="status">{placesLoading?rt.loading:rt.empty}</p>}
              {shown.slice(0,cardCount).map((place)=><article key={place.id} className={`place-card ${selected?.id===place.id?"selected":""}`}>
                <button type="button" className="place-card-details" onClick={()=>selectPlace(place)} aria-label={`${place.name} · ${t.detail}`}>
                  <span className="category-dot" style={{background:colors[place.category]}} />
                  <span className="place-card-copy"><small>{place.neighborhood}</small><strong>{place.name}</strong>{place.tag&&<em className="place-tag">{place.tag[locale]}</em>}<span>{place.summary?.[locale]??place.address??""}</span></span>
                  <span className="place-card-side">{place.rating!=="—"&&<b className="rating">{/^\d/.test(place.rating)?`★ ${place.rating}`:place.rating}</b>}{badge(place)}</span>
                </button>
                <a className="place-card-map" href={mapsUrl(place)} target="_blank" rel="noopener noreferrer" aria-label={`${openMapsCopy[locale]}: ${place.name}`}>⌖ {openMapsCopy[locale]} ↗</a>
              </article>)}
              {shown.length>cardCount&&<button type="button" className="more-cards" onClick={()=>setCardLimit({key:cardKey,count:cardCount+CARD_PAGE})}>{rt.more} ({shown.length-cardCount})</button>}
            </div>
          </div>

          {selected&&<aside className="detail-panel" ref={detailRef} aria-label={t.detail}>
            <div className="detail-accent" style={{background:colors[selected.category]}} />
            {selected.photo&&<figure className="detail-photo"><img src={selected.photo.src} alt={selected.photo.alt}/><figcaption>© <a href={selected.photo.url} target="_blank" rel="noreferrer">{selected.photo.credit}</a></figcaption></figure>}
            <div className="detail-head"><p>{categoryName(selected.category)}</p><h2>{selected.name}</h2>{selected.rating!=="—"&&<span className="google-score">{/^\d/.test(selected.rating)?`★ ${selected.rating}${selected.reviews?` · ${selected.reviews}`:""}`:selected.rating}</span>}{selected.tag?<span className="detail-tag">{selected.tag[locale]}</span>:selected.curated&&<span className="detail-tag">{rt.curated}</span>}{badge(selected,true)}</div>
            <p className="detail-summary">{selected.summary?.[locale]??(selected.source==="osm"?rt.osm:`${rt.imported}${selected.checkedAt?` ${rt.checked} ${new Intl.DateTimeFormat(locale,{dateStyle:"medium"}).format(new Date(selected.checkedAt))}.`:""}`)}</p>
            <button type="button" className={`favorite-button ${favoriteIds.includes(selected.id)?"active":""}`} onClick={()=>toggleFavorite(selected.id)}>{favoriteIds.includes(selected.id)?"♥":"♡"} {favoriteIds.includes(selected.id)?at.saved:at.save}</button>
            {selected.languages&&<div className="language-row"><b>{t.languages}</b>{selected.languages.map((language)=><span key={language}>{language}</span>)}</div>}
            <h3 className="practical-title">{at.practical}</h3>
            <dl className="facts"><div><dt>{t.neighborhood}</dt><dd>{selected.neighborhood}</dd></div>{selected.address&&<div className="fact-address"><dt>{addressCopy[locale]}</dt><dd>{selected.address}</dd></div>}{selected.visit&&<div><dt>{t.time}</dt><dd>{selected.visit}</dd></div>}{selected.hours&&<div className={selected.hours.length>60?"fact-address":undefined}><dt>{xt.hours}</dt><dd>{selected.hours}</dd></div>}{selected.access&&<div><dt>{xt.access}</dt><dd>{selected.access[locale]}</dd></div>}{selected.rating!=="—"&&<div><dt>{t.googleRating}</dt><dd>{selected.rating}</dd></div>}<div><dt>{t.community}</dt><dd>{summary.average?`★ ${summary.average} · ${summary.count} ${t.reviewsCount}`:`—`}</dd></div></dl>
            <div className="directions"><b>{at.directions}</b><div><a href={directionsUrl(selected,"walking")} target="_blank" rel="noreferrer">🚶 {at.walk}</a><a href={directionsUrl(selected,"transit")} target="_blank" rel="noreferrer">▣ {at.transit}</a><a href={directionsUrl(selected,"driving")} target="_blank" rel="noreferrer">🚗 {at.drive}</a></div></div>
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
          </aside>}
        </div>
        <p className="source">{t.source} {rt.osmCredit}</p>
      </section>
      <SafetyHub locale={locale} coords={userLocation?.coords??null}/>
      <BusinessSignup locale={locale}/>
      </div>
    </main>
    <footer><div className="footer-brand"><img src="/assets/sos-logo-v2.png" alt="SOS Travellers · Just Enjoy"/><p><small>{t.footer}</small></p></div><a href="https://www.nuevopudahuel.cl/transporte-oficial" target="_blank" rel="noreferrer">{t.official} ↗</a></footer>
  </>;
}
