import type { Locale } from "./places";
import type { RegionId, ZoneId } from "./chile-regions";

export type TipTopic = "season"|"transport"|"pack"|"safety"|"connectivity";
type Copy = Record<Locale,string>;

// General orientation only: conditions, prices and entry rules change, so the
// UI shows these with a "verify before you travel" note.
export const zoneTips:Record<ZoneId,Record<TipTopic,Copy>> = {
  "norte-grande": {
    season:{
      es:"Se visita todo el año. Entre enero y febrero el invierno altiplánico trae lluvias y cortes de camino en la cordillera; en la costa casi no llueve.",
      en:"Good all year. In January and February the altiplano rainy season can close mountain roads; the coast stays almost rain-free.",
      pt:"Pode ser visitado o ano todo. Em janeiro e fevereiro o inverno altiplânico traz chuvas e bloqueios de estrada na cordilheira; no litoral quase não chove.",
      fr:"Se visite toute l'année. En janvier et février, la saison des pluies de l'altiplano peut couper les routes de montagne ; la côte reste presque sans pluie." },
    transport:{
      es:"Las distancias son enormes: vuela a Arica, Iquique, Antofagasta o Calama y muévete con excursiones o auto arrendado. Carga combustible en cada ciudad.",
      en:"Distances are huge: fly into Arica, Iquique, Antofagasta or Calama, then use tours or a rental car. Fill the tank in every town.",
      pt:"As distâncias são enormes: voe para Arica, Iquique, Antofagasta ou Calama e use passeios ou carro alugado. Abasteça em cada cidade.",
      fr:"Les distances sont immenses : arrivez en avion à Arica, Iquique, Antofagasta ou Calama, puis prenez des excursions ou une voiture de location. Faites le plein dans chaque ville." },
    pack:{
      es:"Protector solar alto, sombrero, lentes y mucha agua. En el desierto la temperatura cae bajo cero de noche: lleva capas y abrigo.",
      en:"High-SPF sunscreen, hat, sunglasses and plenty of water. Desert nights drop below freezing, so bring layers and a warm jacket.",
      pt:"Protetor solar alto, chapéu, óculos e muita água. No deserto a temperatura cai abaixo de zero à noite: leve camadas e agasalho.",
      fr:"Crème solaire à indice élevé, chapeau, lunettes et beaucoup d'eau. Les nuits du désert passent sous zéro : prévoyez plusieurs couches et une veste chaude." },
    safety:{
      es:"Muchos atractivos están sobre 3.500 m: sube de a poco, hidrátate y evita el alcohol el primer día. No salgas de las rutas señalizadas en el desierto.",
      en:"Many sights sit above 3,500 m: gain altitude gradually, hydrate and skip alcohol on day one. Stay on marked routes in the desert.",
      pt:"Muitos atrativos ficam acima de 3.500 m: suba aos poucos, hidrate-se e evite álcool no primeiro dia. Não saia das rotas sinalizadas no deserto.",
      fr:"De nombreux sites dépassent 3 500 m : montez progressivement, hydratez-vous et évitez l'alcool le premier jour. Restez sur les pistes balisées dans le désert." },
    connectivity:{
      es:"Buena señal en ciudades y pueblos principales; en el altiplano y entre localidades no hay cobertura. Descarga mapas sin conexión.",
      en:"Good signal in cities and main towns; none on the altiplano or between settlements. Download offline maps.",
      pt:"Bom sinal em cidades e povoados principais; no altiplano e entre localidades não há cobertura. Baixe mapas offline.",
      fr:"Bon réseau dans les villes et les principaux villages ; aucun sur l'altiplano ni entre les localités. Téléchargez des cartes hors ligne." },
  },
  "norte-chico": {
    season:{
      es:"Cielos despejados casi todo el año, ideales para astroturismo. Playas de diciembre a marzo; en años lluviosos el desierto florece entre agosto y octubre.",
      en:"Clear skies most of the year, ideal for stargazing. Beach season is December to March; in wet years the desert blooms from August to October.",
      pt:"Céu limpo quase o ano todo, ideal para astroturismo. Praias de dezembro a março; em anos chuvosos o deserto floresce entre agosto e outubro.",
      fr:"Ciel dégagé presque toute l'année, idéal pour l'astronomie. Plages de décembre à mars ; les années pluvieuses, le désert fleurit d'août à octobre." },
    transport:{
      es:"Aeropuertos en La Serena y Copiapó, y buses frecuentes desde Santiago. Para los valles y las playas apartadas conviene auto o excursión.",
      en:"Airports in La Serena and Copiapó, plus frequent buses from Santiago. A car or a tour is best for the valleys and remote beaches.",
      pt:"Aeroportos em La Serena e Copiapó e ônibus frequentes desde Santiago. Para os vales e praias afastadas, o melhor é carro ou passeio.",
      fr:"Aéroports à La Serena et Copiapó, et bus fréquents depuis Santiago. Pour les vallées et les plages isolées, mieux vaut une voiture ou une excursion." },
    pack:{
      es:"Protección solar de día y abrigo para las noches de observación astronómica. El mar es frío incluso en verano.",
      en:"Sun protection by day and warm clothes for stargazing nights. The sea is cold even in summer.",
      pt:"Proteção solar de dia e agasalho para as noites de observação. O mar é frio mesmo no verão.",
      fr:"Protection solaire le jour et vêtements chauds pour les nuits d'observation. La mer est froide même en été." },
    safety:{
      es:"Reserva los tours astronómicos con anticipación y revisa la fase lunar. Respeta las banderas de las playas: hay corrientes fuertes.",
      en:"Book observatory tours ahead and check the moon phase. Follow beach flags: currents can be strong.",
      pt:"Reserve os tours astronômicos com antecedência e confira a fase da lua. Respeite as bandeiras das praias: há correntes fortes.",
      fr:"Réservez les visites d'observatoire à l'avance et vérifiez la phase de la lune. Respectez les drapeaux sur les plages : les courants sont forts." },
    connectivity:{
      es:"Cobertura estable en la costa y en las ciudades; en los valles interiores y parques la señal es intermitente.",
      en:"Reliable coverage on the coast and in cities; patchy in inland valleys and parks.",
      pt:"Cobertura estável no litoral e nas cidades; nos vales do interior e parques o sinal é intermitente.",
      fr:"Couverture fiable sur la côte et en ville ; intermittente dans les vallées de l'intérieur et les parcs." },
  },
  centro: {
    season:{
      es:"Clima mediterráneo: verano seco y caluroso de diciembre a marzo, vendimia en marzo y abril, e invierno lluvioso con temporada de esquí de junio a septiembre.",
      en:"Mediterranean climate: hot, dry summer from December to March, grape harvest in March and April, and a rainy winter with ski season from June to September.",
      pt:"Clima mediterrâneo: verão seco e quente de dezembro a março, vindima em março e abril, e inverno chuvoso com temporada de esqui de junho a setembro.",
      fr:"Climat méditerranéen : été chaud et sec de décembre à mars, vendanges en mars et avril, hiver pluvieux avec saison de ski de juin à septembre." },
    transport:{
      es:"Santiago concentra los vuelos y los buses a todo el país. En la capital usa metro y buses con tarjeta bip!; a la costa y a los valles se llega en bus en una a tres horas.",
      en:"Santiago is the hub for flights and buses nationwide. In the capital use the metro and buses with a bip! card; the coast and wine valleys are one to three hours away by bus.",
      pt:"Santiago concentra voos e ônibus para todo o país. Na capital use metrô e ônibus com o cartão bip!; o litoral e os vales ficam a uma a três horas de ônibus.",
      fr:"Santiago est le point de départ des vols et des bus vers tout le pays. Dans la capitale, utilisez le métro et les bus avec la carte bip! ; la côte et les vallées sont à une à trois heures de bus." },
    pack:{
      es:"Ropa por capas: las mañanas y noches son frescas todo el año. Calzado cómodo para los cerros de Valparaíso y abrigo de nieve si subes a la cordillera en invierno.",
      en:"Dress in layers: mornings and nights are cool all year. Comfortable shoes for Valparaíso's hills, and snow gear if you head to the Andes in winter.",
      pt:"Roupa em camadas: manhãs e noites são frescas o ano todo. Calçado confortável para os morros de Valparaíso e roupa de neve se subir à cordilheira no inverno.",
      fr:"Habillez-vous en couches : matins et soirées sont frais toute l'année. Chaussures confortables pour les collines de Valparaíso et tenue de neige pour la cordillère en hiver." },
    safety:{
      es:"En zonas concurridas cuida el teléfono y la mochila, y usa taxis o aplicaciones oficiales de noche. En verano revisa las alertas por incendios forestales.",
      en:"Watch your phone and bag in crowded areas, and use official taxis or ride apps at night. In summer, check wildfire alerts.",
      pt:"Em áreas movimentadas cuide do celular e da mochila, e use táxis ou aplicativos oficiais à noite. No verão, confira os alertas de incêndios florestais.",
      fr:"Dans les lieux fréquentés, surveillez téléphone et sac, et prenez des taxis officiels ou des applications la nuit. En été, consultez les alertes aux feux de forêt." },
    connectivity:{
      es:"La mejor cobertura del país, con 4G y 5G en ciudades. Wi-Fi habitual en alojamientos, cafés y centros comerciales.",
      en:"The best coverage in the country, with 4G and 5G in cities. Wi-Fi is common in lodging, cafés and malls.",
      pt:"A melhor cobertura do país, com 4G e 5G nas cidades. Wi-Fi comum em hospedagens, cafés e shoppings.",
      fr:"La meilleure couverture du pays, avec 4G et 5G en ville. Wi-Fi courant dans les hébergements, cafés et centres commerciaux." },
  },
  sur: {
    season:{
      es:"Llueve todo el año, más en invierno. De diciembre a febrero hay días largos y templados, ideales para lagos, volcanes y parques; reserva con tiempo.",
      en:"It rains year-round, most in winter. December to February brings long, mild days for lakes, volcanoes and parks; book early.",
      pt:"Chove o ano todo, mais no inverno. De dezembro a fevereiro os dias são longos e amenos, ideais para lagos, vulcões e parques; reserve com antecedência.",
      fr:"Il pleut toute l'année, surtout en hiver. De décembre à février, les journées sont longues et douces pour les lacs, volcans et parcs ; réservez tôt." },
    transport:{
      es:"Aeropuertos en Temuco, Valdivia, Osorno y Puerto Montt. Buses conectan bien las ciudades; a Chiloé se cruza en transbordador por el canal de Chacao.",
      en:"Airports in Temuco, Valdivia, Osorno and Puerto Montt. Buses link the towns well; Chiloé is reached by ferry across the Chacao channel.",
      pt:"Aeroportos em Temuco, Valdivia, Osorno e Puerto Montt. Ônibus conectam bem as cidades; para Chiloé cruza-se de balsa pelo canal de Chacao.",
      fr:"Aéroports à Temuco, Valdivia, Osorno et Puerto Montt. Les bus relient bien les villes ; on rejoint Chiloé en ferry par le canal de Chacao." },
    pack:{
      es:"Chaqueta impermeable, calzado de trekking que resista el barro y una capa abrigada, incluso en verano.",
      en:"A waterproof jacket, hiking shoes that handle mud and a warm layer, even in summer.",
      pt:"Jaqueta impermeável, calçado de trekking que aguente lama e uma camada quente, mesmo no verão.",
      fr:"Veste imperméable, chaussures de randonnée adaptées à la boue et une couche chaude, même en été." },
    safety:{
      es:"Antes de subir a un volcán revisa el nivel de alerta y contrata guías autorizados. Infórmate del estado de los senderos en la oficina del parque.",
      en:"Check the alert level before climbing a volcano and hire authorised guides. Ask about trail conditions at the park office.",
      pt:"Antes de subir um vulcão, confira o nível de alerta e contrate guias autorizados. Informe-se sobre as trilhas no escritório do parque.",
      fr:"Avant de gravir un volcan, vérifiez le niveau d'alerte et engagez des guides agréés. Renseignez-vous sur l'état des sentiers au bureau du parc." },
    connectivity:{
      es:"Buena señal en ciudades y pueblos lacustres; en parques nacionales, caminos rurales y partes de Chiloé es débil o nula.",
      en:"Good signal in cities and lake towns; weak or absent in national parks, rural roads and parts of Chiloé.",
      pt:"Bom sinal em cidades e povoados dos lagos; em parques nacionais, estradas rurais e partes de Chiloé é fraco ou inexistente.",
      fr:"Bon réseau dans les villes et villages des lacs ; faible ou absent dans les parcs nationaux, sur les routes rurales et dans certaines zones de Chiloé." },
  },
  patagonia: {
    season:{
      es:"La temporada va de noviembre a marzo, con días muy largos y viento fuerte. En invierno muchos servicios cierran y hay nieve en los caminos.",
      en:"The season runs from November to March, with very long days and strong wind. In winter many services close and roads get snow.",
      pt:"A temporada vai de novembro a março, com dias muito longos e vento forte. No inverno muitos serviços fecham e há neve nas estradas.",
      fr:"La saison va de novembre à mars, avec de très longues journées et un vent fort. En hiver, de nombreux services ferment et les routes sont enneigées." },
    transport:{
      es:"Se llega en avión a Balmaceda, Punta Arenas o Puerto Natales. La Carretera Austral tiene tramos de ripio y transbordadores: planifica combustible y horarios.",
      en:"Fly into Balmaceda, Punta Arenas or Puerto Natales. The Carretera Austral has gravel stretches and ferries: plan fuel and timetables.",
      pt:"Chega-se de avião a Balmaceda, Punta Arenas ou Puerto Natales. A Carretera Austral tem trechos de cascalho e balsas: planeje combustível e horários.",
      fr:"On arrive en avion à Balmaceda, Punta Arenas ou Puerto Natales. La Carretera Austral comporte des tronçons en gravier et des ferries : prévoyez carburant et horaires." },
    pack:{
      es:"Cortaviento impermeable, capas térmicas, guantes y gorro incluso en verano. El clima cambia varias veces en un mismo día.",
      en:"A waterproof windbreaker, thermal layers, gloves and a hat even in summer. The weather shifts several times a day.",
      pt:"Corta-vento impermeável, camadas térmicas, luvas e gorro mesmo no verão. O clima muda várias vezes no mesmo dia.",
      fr:"Coupe-vent imperméable, couches thermiques, gants et bonnet même en été. Le temps change plusieurs fois par jour." },
    safety:{
      es:"Reserva con meses de anticipación refugios, campings y entradas de Torres del Paine. Registra tu ruta y no hagas fuego fuera de los lugares habilitados.",
      en:"Book Torres del Paine refuges, campsites and entry months ahead. Register your route and never light fires outside designated areas.",
      pt:"Reserve com meses de antecedência refúgios, campings e entradas de Torres del Paine. Registre sua rota e não faça fogo fora dos locais permitidos.",
      fr:"Réservez des mois à l'avance refuges, campings et entrées de Torres del Paine. Enregistrez votre itinéraire et ne faites jamais de feu hors des zones autorisées." },
    connectivity:{
      es:"Señal solo en las ciudades y algunos pueblos; en la ruta y en los parques no hay cobertura. Lleva efectivo: no todos los pueblos tienen cajero.",
      en:"Signal only in cities and some towns; none on the road or in the parks. Carry cash: not every town has an ATM.",
      pt:"Sinal só nas cidades e em alguns povoados; na estrada e nos parques não há cobertura. Leve dinheiro: nem todo povoado tem caixa eletrônico.",
      fr:"Réseau uniquement dans les villes et quelques villages ; aucun sur la route ni dans les parcs. Emportez des espèces : tous les villages n'ont pas de distributeur." },
  },
  islas: {
    season:{
      es:"Rapa Nui tiene clima subtropical todo el año; es más cálido y húmedo de diciembre a marzo. En febrero se celebra la fiesta Tapati.",
      en:"Rapa Nui is subtropical all year, warmest and most humid from December to March. The Tapati festival takes place in February.",
      pt:"Rapa Nui tem clima subtropical o ano todo; é mais quente e úmido de dezembro a março. Em fevereiro acontece a festa Tapati.",
      fr:"Rapa Nui a un climat subtropical toute l'année, plus chaud et humide de décembre à mars. La fête Tapati a lieu en février." },
    transport:{
      es:"A Rapa Nui solo se llega en vuelo desde Santiago (unas cinco horas y media). A Juan Fernández vuelan avionetas que dependen del clima.",
      en:"Rapa Nui is reached only by flight from Santiago (about five and a half hours). Small planes to Juan Fernández depend on the weather.",
      pt:"Só se chega a Rapa Nui em voo desde Santiago (cerca de cinco horas e meia). Para Juan Fernández voam pequenos aviões que dependem do clima.",
      fr:"On ne rejoint Rapa Nui qu'en avion depuis Santiago (environ cinq heures et demie). De petits avions desservent Juan Fernández selon la météo." },
    pack:{
      es:"Protección solar, impermeable liviano y calzado para caminar sobre roca volcánica. Los precios en la isla son más altos que en el continente.",
      en:"Sun protection, a light rain jacket and shoes for volcanic rock. Prices on the island are higher than on the mainland.",
      pt:"Proteção solar, capa de chuva leve e calçado para caminhar sobre rocha vulcânica. Os preços na ilha são mais altos que no continente.",
      fr:"Protection solaire, imperméable léger et chaussures pour marcher sur la roche volcanique. Les prix sur l'île sont plus élevés que sur le continent." },
    safety:{
      es:"Rapa Nui exige requisitos de ingreso propios (pasaje de regreso, alojamiento registrado y formulario) y estadía limitada: verifícalos antes de comprar. No toques ni subas a los moái.",
      en:"Rapa Nui has its own entry requirements (return ticket, registered lodging and a form) and a limited stay: check them before booking. Never touch or climb the moai.",
      pt:"Rapa Nui tem requisitos próprios de entrada (passagem de volta, hospedagem registrada e formulário) e estadia limitada: verifique antes de comprar. Não toque nem suba nos moais.",
      fr:"Rapa Nui a ses propres conditions d'entrée (billet retour, hébergement enregistré et formulaire) et un séjour limité : vérifiez-les avant d'acheter. Ne touchez pas les moaï et n'y montez pas." },
    connectivity:{
      es:"Internet más lento y cobertura limitada fuera de Hanga Roa. Lleva efectivo como respaldo.",
      en:"Slower internet and limited coverage outside Hanga Roa. Bring cash as a backup.",
      pt:"Internet mais lenta e cobertura limitada fora de Hanga Roa. Leve dinheiro como reserva.",
      fr:"Internet plus lent et couverture limitée hors de Hanga Roa. Emportez des espèces en secours." },
  },
};

export const islandSummary:Copy = {
  es:"Rapa Nui y el archipiélago Juan Fernández: moái, volcanes y mar abierto a miles de kilómetros del continente.",
  en:"Rapa Nui and the Juan Fernández archipelago: moai, volcanoes and open ocean thousands of kilometres offshore.",
  pt:"Rapa Nui e o arquipélago Juan Fernández: moais, vulcões e mar aberto a milhares de quilômetros do continente.",
  fr:"Rapa Nui et l'archipel Juan Fernández : moaï, volcans et océan à des milliers de kilomètres du continent.",
};
export const islandHighlights = ["Rano Raraku","Ahu Tongariki","Anakena","Orongo","Isla Robinson Crusoe"];

export const regionTips:Record<RegionId,{summary:Copy; highlights:string[]}> = {
  AP:{ highlights:["Morro de Arica","Parque Nacional Lauca","Lago Chungará","Putre","Momias Chinchorro"], summary:{
    es:"Playas templadas todo el año y, a pocas horas, el altiplano con lagos y volcanes sobre los 4.000 m.",
    en:"Mild beaches all year and, a few hours inland, the altiplano with lakes and volcanoes above 4,000 m.",
    pt:"Praias amenas o ano todo e, a poucas horas, o altiplano com lagos e vulcões acima de 4.000 m.",
    fr:"Plages tempérées toute l'année et, à quelques heures, l'altiplano avec lacs et volcans à plus de 4 000 m." } },
  TA:{ highlights:["Playa Cavancha","Humberstone","Zona Franca de Iquique","Pica","Geoglifos de Pintados"], summary:{
    es:"Iquique combina playa, parapente y compras libres de impuestos, con oficinas salitreras patrimoniales en el desierto.",
    en:"Iquique mixes beach, paragliding and duty-free shopping, with heritage nitrate towns out in the desert.",
    pt:"Iquique combina praia, parapente e compras livres de impostos, com antigas salitreiras patrimoniais no deserto.",
    fr:"Iquique mêle plage, parapente et achats hors taxes, avec d'anciennes cités du salpêtre classées dans le désert." } },
  AN:{ highlights:["San Pedro de Atacama","Valle de la Luna","Géiseres del Tatio","Salar de Atacama","La Portada"], summary:{
    es:"El corazón del desierto de Atacama: salares, géiseres, lagunas altiplánicas y algunos de los cielos más limpios del mundo.",
    en:"The heart of the Atacama Desert: salt flats, geysers, high-altitude lagoons and some of the clearest skies on Earth.",
    pt:"O coração do deserto do Atacama: salares, gêiseres, lagoas altiplânicas e alguns dos céus mais limpos do mundo.",
    fr:"Le cœur du désert d'Atacama : salars, geysers, lagunes d'altitude et certains des ciels les plus purs au monde." } },
  AT:{ highlights:["Bahía Inglesa","Parque Nacional Pan de Azúcar","Desierto florido","Parque Nevado Tres Cruces","Caldera"], summary:{
    es:"Playas de arena blanca y agua turquesa, parques costeros y, en años de lluvia, el desierto florido.",
    en:"White-sand beaches with turquoise water, coastal parks and, in rainy years, the flowering desert.",
    pt:"Praias de areia branca e água turquesa, parques costeiros e, em anos de chuva, o deserto florido.",
    fr:"Plages de sable blanc aux eaux turquoise, parcs côtiers et, les années de pluie, le désert fleuri." } },
  CO:{ highlights:["Valle del Elqui","La Serena","Pisco Elqui","Reserva Pingüino de Humboldt","Parque Nacional Fray Jorge"], summary:{
    es:"Capital del astroturismo y del pisco: valles soleados, observatorios y una costa larga de playas y caletas.",
    en:"Chile's capital of stargazing and pisco: sunny valleys, observatories and a long coast of beaches and fishing coves.",
    pt:"Capital do astroturismo e do pisco: vales ensolarados, observatórios e um litoral longo de praias e enseadas.",
    fr:"Capitale de l'astronomie et du pisco : vallées ensoleillées, observatoires et longue côte de plages et de criques." } },
  VS:{ highlights:["Cerros de Valparaíso","Viña del Mar","Valle de Casablanca","Isla Negra","Reñaca y Concón"], summary:{
    es:"El puerto patrimonial de cerros y ascensores, balnearios clásicos y viñas de clima frío a una hora de Santiago.",
    en:"The heritage port of hills and funiculars, classic beach resorts and cool-climate wineries an hour from Santiago.",
    pt:"O porto patrimonial de morros e funiculares, balneários clássicos e vinícolas de clima frio a uma hora de Santiago.",
    fr:"Le port classé aux collines et funiculaires, des stations balnéaires classiques et des vignobles de climat frais à une heure de Santiago." } },
  RM:{ highlights:["Cerro San Cristóbal","Barrio Lastarria","Cajón del Maipo","Valle del Maipo","Centros de esquí"], summary:{
    es:"La capital: museos, barrios gastronómicos y miradores, con viñas, nieve y montaña a menos de dos horas.",
    en:"The capital: museums, food neighbourhoods and viewpoints, with wineries, snow and mountains under two hours away.",
    pt:"A capital: museus, bairros gastronômicos e mirantes, com vinícolas, neve e montanha a menos de duas horas.",
    fr:"La capitale : musées, quartiers gourmands et points de vue, avec vignobles, neige et montagne à moins de deux heures." } },
  LI:{ highlights:["Valle de Colchagua","Santa Cruz","Pichilemu","Punta de Lobos","Sewell"], summary:{
    es:"Tierra de vinos tintos y tradición huasa, con las mejores olas de surf del país en Pichilemu.",
    en:"Red-wine country and huaso tradition, with the country's best surf breaks at Pichilemu.",
    pt:"Terra de vinhos tintos e tradição huasa, com as melhores ondas de surfe do país em Pichilemu.",
    fr:"Terre de vins rouges et de tradition huasa, avec les meilleures vagues de surf du pays à Pichilemu." } },
  ML:{ highlights:["Parque Nacional Radal Siete Tazas","Valle del Maule","Constitución","Vilches · Altos de Lircay","Lago Colbún"], summary:{
    es:"Viñas antiguas, pozones y cascadas de roca volcánica y una costa tranquila de pueblos pesqueros.",
    en:"Old vineyards, pools and waterfalls carved in volcanic rock, and a quiet coast of fishing towns.",
    pt:"Vinhedos antigos, piscinas naturais e cachoeiras em rocha vulcânica e um litoral tranquilo de vilas de pescadores.",
    fr:"Vieux vignobles, bassins et cascades taillés dans la roche volcanique, et une côte paisible de villages de pêcheurs." } },
  NB:{ highlights:["Nevados de Chillán","Termas de Chillán","Mercado de Chillán","Cobquecura","Valle del Itata"], summary:{
    es:"Nieve y termas en la cordillera, mercado y artesanía en Chillán, y lobos marinos en la costa de Cobquecura.",
    en:"Snow and hot springs in the Andes, market and crafts in Chillán, and sea lions on the Cobquecura coast.",
    pt:"Neve e termas na cordilheira, mercado e artesanato em Chillán, e lobos-marinhos no litoral de Cobquecura.",
    fr:"Neige et sources chaudes dans la cordillère, marché et artisanat à Chillán, et otaries sur la côte de Cobquecura." } },
  BI:{ highlights:["Concepción","Salto del Laja","Parque Nacional Laguna del Laja","Lota","Alto Biobío"], summary:{
    es:"Ciudad universitaria y musical, saltos de agua junto a la ruta y volcanes en la alta cordillera.",
    en:"A university and music city, waterfalls right off the highway and volcanoes in the high Andes.",
    pt:"Cidade universitária e musical, quedas d'água junto à estrada e vulcões na alta cordilheira.",
    fr:"Ville universitaire et musicale, chutes d'eau au bord de la route et volcans dans la haute cordillère." } },
  AR:{ highlights:["Pucón","Volcán Villarrica","Parque Nacional Conguillío","Parque Nacional Huerquehue","Lago Caburgua"], summary:{
    es:"Volcanes, bosques de araucarias, termas y cultura mapuche, con Pucón como base de aventura.",
    en:"Volcanoes, araucaria forests, hot springs and Mapuche culture, with Pucón as the adventure base.",
    pt:"Vulcões, florestas de araucárias, termas e cultura mapuche, com Pucón como base de aventura.",
    fr:"Volcans, forêts d'araucarias, sources chaudes et culture mapuche, avec Pucón comme base d'aventure." } },
  LR:{ highlights:["Valdivia","Feria Fluvial","Niebla y Corral","Reserva Huilo Huilo","Lago Ranco"], summary:{
    es:"Ciudad fluvial de cerveza y fuertes españoles, rodeada de selva valdiviana y lagos.",
    en:"A river city of craft beer and Spanish forts, surrounded by Valdivian rainforest and lakes.",
    pt:"Cidade fluvial de cerveja e fortes espanhóis, cercada de floresta valdiviana e lagos.",
    fr:"Ville fluviale de bière et de forts espagnols, entourée de forêt valdivienne et de lacs." } },
  LL:{ highlights:["Puerto Varas","Saltos del Petrohué","Frutillar","Iglesias de Chiloé","Parque Nacional Pumalín"], summary:{
    es:"Lagos frente a volcanes, herencia alemana, las iglesias y palafitos de Chiloé y la puerta norte de la Carretera Austral.",
    en:"Lakes facing volcanoes, German heritage, Chiloé's churches and stilt houses, and the northern gateway to the Carretera Austral.",
    pt:"Lagos diante de vulcões, herança alemã, as igrejas e palafitas de Chiloé e a porta norte da Carretera Austral.",
    fr:"Lacs face aux volcans, héritage allemand, églises et maisons sur pilotis de Chiloé, et porte nord de la Carretera Austral." } },
  AI:{ highlights:["Carretera Austral","Capillas de Mármol","Parque Nacional Queulat","Caleta Tortel","Parque Nacional Patagonia"], summary:{
    es:"La Patagonia menos visitada: ventisqueros colgantes, fiordos, ríos turquesa y pueblos unidos por la Carretera Austral.",
    en:"Patagonia's least-visited side: hanging glaciers, fjords, turquoise rivers and villages strung along the Carretera Austral.",
    pt:"A Patagônia menos visitada: geleiras suspensas, fiordes, rios turquesa e povoados ligados pela Carretera Austral.",
    fr:"La Patagonie la moins fréquentée : glaciers suspendus, fjords, rivières turquoise et villages reliés par la Carretera Austral." } },
  MA:{ highlights:["Torres del Paine","Puerto Natales","Punta Arenas","Isla Magdalena","Estrecho de Magallanes"], summary:{
    es:"El extremo sur: Torres del Paine, glaciares, pingüinos y el estrecho de Magallanes.",
    en:"The far south: Torres del Paine, glaciers, penguins and the Strait of Magellan.",
    pt:"O extremo sul: Torres del Paine, geleiras, pinguins e o estreito de Magalhães.",
    fr:"L'extrême sud : Torres del Paine, glaciers, manchots et le détroit de Magellan." } },
};
