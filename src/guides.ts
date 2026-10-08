import { Locale } from "./places";

// Ids are mirrored in api/_routes/guide-leads.ts and in the guide_leads SQL check.
// A guide without `checkoutUrl` is not on sale yet: the section collects emails instead of charging.
export type Guide={id:string;icon:string;priceClp:number;pages:number;featured?:boolean;checkoutUrl?:string;copy:Record<Locale,{title:string;blurb:string;open:string[];locked:string[]}>};

export const guides:Guide[]=[
  {id:"santiago-noche",icon:"☾",priceClp:4990,pages:18,copy:{
    es:{title:"Santiago de noche, seguro",blurb:"Barrios, eventos, cómo volver y contactos de transporte de confianza.",open:["Qué pasa hoy cerca de ti","Último metro por línea"],locked:["Ruta de bares en Lastarria y Bellavista","Radio taxis colaboradores con tarifa acordada"]},
    en:{title:"Santiago by night, safely",blurb:"Districts, events, how to get back and trusted transport contacts.",open:["What is on near you today","Last metro by line"],locked:["Bar route through Lastarria and Bellavista","Partner radio taxis with agreed fares"]},
    pt:{title:"Santiago à noite, com segurança",blurb:"Bairros, eventos, como voltar e contatos de transporte confiáveis.",open:["O que acontece hoje perto de você","Último metrô por linha"],locked:["Rota de bares em Lastarria e Bellavista","Rádio táxis parceiros com tarifa combinada"]},
    fr:{title:"Santiago la nuit, en sécurité",blurb:"Quartiers, événements, comment rentrer et contacts de transport fiables.",open:["Ce qui se passe près de vous aujourd’hui","Dernier métro par ligne"],locked:["Tournée des bars à Lastarria et Bellavista","Radio-taxis partenaires à tarif convenu"]},
  }},
  {id:"pase-sos",icon:"★",priceClp:9990,pages:60,featured:true,copy:{
    es:{title:"Pase SOS: todas las guías",blurb:"Todas las guías de Santiago en un solo pago, con los descuentos de colaboradores.",open:["Las tres guías de Santiago","Actualizaciones durante 30 días"],locked:["Escapadas de un día desde Santiago","Descuentos en locales y transportes colaboradores"]},
    en:{title:"SOS Pass: every guide",blurb:"Every Santiago guide in a single payment, plus partner discounts.",open:["All three Santiago guides","Updates for 30 days"],locked:["Day trips from Santiago","Discounts at partner venues and transport"]},
    pt:{title:"Passe SOS: todos os guias",blurb:"Todos os guias de Santiago em um só pagamento, com descontos de parceiros.",open:["Os três guias de Santiago","Atualizações por 30 dias"],locked:["Bate-voltas a partir de Santiago","Descontos em locais e transportes parceiros"]},
    fr:{title:"Pass SOS : tous les guides",blurb:"Tous les guides de Santiago en un seul paiement, avec les remises partenaires.",open:["Les trois guides de Santiago","Mises à jour pendant 30 jours"],locked:["Excursions d’une journée depuis Santiago","Remises chez les lieux et transports partenaires"]},
  }},
  {id:"santiago-3-dias",icon:"◷",priceClp:4990,pages:22,copy:{
    es:{title:"3 días en Santiago",blurb:"Itinerario hora a hora con costos reales, reservas y plan B si llueve.",open:["Día 1: centro histórico a pie","Presupuesto diario por tipo de viajero"],locked:["Días 2 y 3 con horarios y traslados","Dónde comer cerca de cada parada"]},
    en:{title:"3 days in Santiago",blurb:"Hour-by-hour itinerary with real costs, bookings and a rainy-day plan B.",open:["Day 1: historic centre on foot","Daily budget by traveller type"],locked:["Days 2 and 3 with times and transfers","Where to eat near each stop"]},
    pt:{title:"3 dias em Santiago",blurb:"Roteiro hora a hora com custos reais, reservas e plano B para chuva.",open:["Dia 1: centro histórico a pé","Orçamento diário por tipo de viajante"],locked:["Dias 2 e 3 com horários e deslocamentos","Onde comer perto de cada parada"]},
    fr:{title:"3 jours à Santiago",blurb:"Itinéraire heure par heure avec coûts réels, réservations et plan B en cas de pluie.",open:["Jour 1 : centre historique à pied","Budget quotidien par type de voyageur"],locked:["Jours 2 et 3 avec horaires et trajets","Où manger près de chaque étape"]},
  }},
  {id:"metro-aeropuerto",icon:"▣",priceClp:0,pages:10,copy:{
    es:{title:"Metro y aeropuerto sin perderse",blurb:"Tarjeta bip!, horarios, combinaciones y la estación de cada atractivo.",open:["Cómo comprar y cargar la bip!","Del aeropuerto al centro paso a paso","Estación de Metro de cada atractivo"],locked:[]},
    en:{title:"Metro and airport without getting lost",blurb:"bip! card, hours, interchanges and the station for each attraction.",open:["How to buy and top up a bip! card","Airport to downtown step by step","The Metro station for each attraction"],locked:[]},
    pt:{title:"Metrô e aeroporto sem se perder",blurb:"Cartão bip!, horários, integrações e a estação de cada atração.",open:["Como comprar e carregar o bip!","Do aeroporto ao centro passo a passo","Estação de metrô de cada atração"],locked:[]},
    fr:{title:"Métro et aéroport sans se perdre",blurb:"Carte bip!, horaires, correspondances et la station de chaque site.",open:["Acheter et recharger la carte bip!","De l’aéroport au centre pas à pas","La station de métro de chaque site"],locked:[]},
  }},
];
