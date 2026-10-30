import type { RegionId } from "./chile-regions";
import type { AdminData, ManagedService, OwnerData, PlaceRow } from "./panel";
import { defaultCategories, type Category, type Service } from "./services-board";
import type { Promotion } from "./traveller-home";

// The data behind /panel?demo=owner|boss|tourist, kept in memory (a reload starts over), so each role's panel can be
// shown without an account. Nothing here reaches the API or Supabase. Answers mimic api/_routes/owner.ts and admin.ts.
type Store=Omit<AdminData,"me">&{places:PlaceRow[]};
type Body=Record<string,unknown>;

const HOUR=3600000,now=Date.now();
const ago=(hours:number)=>new Date(now-hours*HOUR).toISOString();
const inDays=(days:number)=>new Date(now+days*24*HOUR).toISOString().slice(0,10);
let lastId=900,savedProspect=0;

const store:Store={
  categories:[...defaultCategories.map((item)=>({...item,status:"published"})),{id:"artesania-demo",names:{es:"Artesanía"},status:"pending"}],
  prospects:[
    {id:601,contactName:"Paula Rojas",contactEmail:"paula@example.com",contactPhone:"+56 9 3333 4444",businessName:"Kayak Sur",kind:"tour",region:"LL",comuna:"Puerto Varas",whatsapp:"+56 9 3333 4444",languages:["ES","EN"],description:"Salidas en kayak por el lago Llanquihue.",services:[{category:"tour",title:"Kayak al atardecer",description:"Salida guiada de dos horas con equipo incluido.",priceClp:"35000",languages:["ES","EN"]}],notes:"Contactada en la feria de turismo. Responde por WhatsApp.",status:"prospecto",createdAt:ago(52)},
    {id:602,contactName:"Diego Soto",contactEmail:"diego@example.com",businessName:"Traslados Elqui",kind:"other",region:"CO",comuna:"Vicuña",languages:["ES"],services:[],status:"invitada",invitedAt:ago(20),createdAt:ago(96)},
  ],
  users:[
    {id:"demo-tourist-3",email:"sofia@example.com",firstName:"Sofía",country:"Argentina",type:"cliente",approval:"aprobada",level:"basico",state:"bloqueado",stateReason:"Publicó opiniones con publicidad de otro sitio.",stateAt:ago(2),createdAt:ago(5)},
    {id:"demo-tourist-2",email:"lucas@example.com",firstName:"Lucas",country:"Brasil",type:"cliente",approval:"aprobada",level:"medio",levelUntil:new Date(now+30*24*HOUR).toISOString(),state:"activo",createdAt:ago(30)},
    {id:"demo-tourist",email:"emma@example.com",firstName:"Emma",country:"Francia",type:"cliente",approval:"aprobada",level:"basico",state:"activo",createdAt:ago(72)},
    {id:"demo-owner-2",email:"jorge@example.com",firstName:"Jorge",country:"Chile",type:"empresa",approval:"aprobada",level:"alto",state:"activo",rut:"••.•••.678-5",createdAt:ago(216)},
    {id:"demo-owner",email:"carolina@example.com",firstName:"Carolina",country:"Chile",type:"empresa",approval:"aprobada",level:"premium",state:"activo",rut:"••.•••.432-1",createdAt:ago(288)},
    {id:"demo-owner-3",email:"andes@example.com",firstName:"Matías",country:"Chile",type:"empresa",approval:"pendiente",level:"basico",state:"activo",createdAt:ago(3)},
    {id:"demo-boss",email:"equipo@example.com",firstName:"Equipo",country:"Chile",type:"admin",approval:"aprobada",level:"basico",state:"activo",createdAt:ago(960)},
  ],
  levels:[
    {code:"basico",name:"Básico",order:1,clientBenefits:["Mapa y consejos de viaje"],businessBenefits:["Ficha en el mapa"],monthlyPrice:null},
    {code:"medio",name:"Medio",order:2,clientBenefits:["Guía de Santiago en 3 días"],businessBenefits:["Promociones en la app"],monthlyPrice:null},
    {code:"alto",name:"Alto",order:3,clientBenefits:["Todas las guías exclusivas"],businessBenefits:["Ficha destacada en su categoría"],monthlyPrice:null},
    {code:"premium",name:"Premium",order:4,clientBenefits:["Todas las guías","Asistencia por WhatsApp"],businessBenefits:["Ficha destacada","Etiqueta NFC de regalo"],monthlyPrice:null},
  ],
  audit:[
    {id:9003,actorId:"demo-boss",origin:"admin",action:"bloquear",table:"tbl_usuarios",recordId:"demo-tourist-3",before:{estado:"activo"},after:{estado:"bloqueado"},reason:"Publicó opiniones con publicidad de otro sitio.",createdAt:ago(2)},
    {id:9002,actorId:"demo-boss",origin:"admin",action:"cambiar_nivel",table:"tbl_usuarios",recordId:"demo-owner",before:{nivel:"alto"},after:{nivel:"premium"},createdAt:ago(26)},
    {id:9001,origin:"base",action:"crear",table:"partners",recordId:"103",createdAt:ago(120)},
  ],
  services:[
    {id:701,partnerId:101,category:"food",title:"Desayuno chileno con café de especialidad",description:"Marraqueta, palta, huevos y café de grano tostado en Santiago. Ideal antes de subir al cerro Santa Lucía.",priceClp:9500,priceFrom:false,duration:"1 hora",languages:["ES","EN"],whatsapp:"+56 9 1111 2222",photos:[{path:"demo/centro.jpg",url:"/images/scenes/centro.jpg"}],status:"published",updatedAt:ago(40)},
    {id:702,partnerId:102,category:"transfer",title:"Traslado aeropuerto – Santiago centro",description:"Auto con conductor desde el aeropuerto hasta tu alojamiento en Santiago, Providencia o Las Condes. Precio fijo por viaje.",priceClp:28000,priceFrom:true,duration:"40 minutos",languages:["ES"],phone:"+56 2 3000 0000",photos:[],status:"published",updatedAt:ago(60)},
    {id:703,partnerId:104,category:"tour",title:"Trekking al Cajón del Maipo",description:"Caminata guiada de día completo con almuerzo de montaña y traslado desde Santiago. Nivel intermedio.",priceClp:45000,priceFrom:false,duration:"Día completo",languages:["ES","EN"],whatsapp:"+56 9 7777 8888",bookingUrl:"https://example.com/andes",photos:[{path:"demo/desierto.jpg",url:"/images/scenes/desierto.jpg"}],status:"pending",updatedAt:ago(2)},
    {id:704,partnerId:103,category:"tour",title:"Noche de estrellas en el Elqui",description:"Observación astronómica con telescopio y guía en cielo oscuro.",priceFrom:false,languages:["ES","EN","PT"],photos:[],status:"rejected",reviewNote:"Agrega el precio o indica que es a convenir, y el punto de encuentro.",updatedAt:ago(30)},
  ],
  places:[
    {id:"precolombino",name:"Museo Chileno de Arte Precolombino",category:"museum",region:"RM",locality:"Santiago",address:"Bandera 361, Santiago",rating:4.7,source:"curated",status:"published"},
    {id:"cerro-santa-lucia",name:"Cerro Santa Lucía",category:"view",region:"RM",locality:"Santiago",address:"Av. Libertador Bernardo O'Higgins",rating:4.6,source:"curated",status:"published"},
    {id:"demo-cafe-cerrado",name:"Café que ya cerró",category:"coffee",region:"RM",locality:"Providencia",rating:4.3,source:"google",status:"hidden"},
    {id:"ascensor-reina-victoria",name:"Ascensor Reina Victoria",category:"view",region:"VS",locality:"Valparaíso",rating:4.5,source:"google",status:"published"},
  ],
  businesses:[
    {id:101,kind:"venue",name:"Café La Esquina",region:"RM",phone:"+56 2 2000 0000",whatsapp:"+56 9 1111 2222",url:"https://example.com/cafe-la-esquina",address:"José Victorino Lastarria 300, Santiago",languages:["ES","EN"],status:"published",ownerId:"demo-owner",active:true,activeUntil:new Date(now+7*HOUR).toISOString(),reviewPlaceId:"partner-101",
      photos:[{path:"demo/centro.jpg",status:"published",url:"/images/scenes/centro.jpg"},{path:"demo/mar.jpg",status:"pending",url:"/images/scenes/mar.jpg"}]},
    {id:102,kind:"radio_taxi",name:"Radio Taxi Cordillera",region:"RM",phone:"+56 2 3000 0000",languages:["ES"],status:"published",ownerId:"demo-owner-2",active:false,reviewPlaceId:"partner-102",photos:[]},
    {id:104,kind:"tour",name:"Andes Trekking",region:"RM",languages:["ES","EN"],status:"draft",ownerId:"demo-owner-3",active:false,reviewPlaceId:"partner-104",photos:[]},
    {id:103,kind:"tour",name:"Tour Cielos del Elqui",region:"CO",url:"https://example.com/cielos-del-elqui",languages:["ES","EN","PT"],status:"draft",active:false,reviewPlaceId:"partner-103",
      photos:[{path:"demo/desierto.jpg",status:"pending",url:"/images/scenes/desierto.jpg"}]},
  ],
  applications:[
    {id:501,businessName:"Hostal Cerro Alegre",contactName:"Paula",email:"paula@example.com",phone:"+56 9 3333 4444",category:"Alojamiento",address:"Cerro Alegre, Valparaíso",description:"Hostal familiar con vista a la bahía. Atendemos en inglés y portugués.",website:"https://example.com/hostal",interest:"listing",status:"pending",createdAt:ago(10)},
    {id:502,businessName:"Picada El Fogón",contactName:"Marcos",phone:"+56 9 5555 6666",category:"Restaurante",address:"Barrio Italia, Providencia",description:"Comida chilena casera y menú del día.",interest:"partner",status:"pending",createdAt:ago(40)},
    {id:503,businessName:"Café La Esquina",contactName:"Carolina",email:"carolina@example.com",category:"Café",address:"Barrio Lastarria, Santiago",description:"Café de especialidad a pasos del cerro Santa Lucía.",interest:"listing",status:"approved",createdAt:ago(290)},
  ],
  reviews:[
    {id:304,placeId:"partner-101",authorName:"Anónimo",rating:1,comment:"Visiten mi página para ganar premios.",status:"hidden",createdAt:ago(4)},
    {id:301,placeId:"partner-101",authorName:"Emma",rating:5,comment:"Excelente café y nos explicaron cómo llegar al cerro Santa Lucía.",status:"published",createdAt:ago(20)},
    {id:302,placeId:"partner-101",authorName:"Lucas",rating:4,comment:"Nos atendieron en portugués. A mediodía se llena.",status:"published",createdAt:ago(50)},
    {id:303,placeId:"precolombino",authorName:"Sofía",rating:5,comment:"Imperdible. Vayan temprano para recorrerlo con calma.",status:"published",createdAt:ago(80)},
  ],
  suggestions:[
    {id:401,role:"owner",message:"Me gustaría ver cuántas personas abrieron la ficha de mi local esta semana.",status:"new",created_at:ago(6)},
    {id:402,role:"tourist",message:"Agreguen los horarios del Metro los domingos.",status:"read",created_at:ago(30)},
    {id:403,role:"guest",message:"La app podría avisar cuando un local cercano está atendiendo.",status:"done",created_at:ago(100)},
  ],
  promotions:[
    {id:203,partnerId:103,title:"10% en la noche de estrellas para grupos",description:"Desde 4 personas.",validUntil:inDays(60),status:"pending"},
    {id:202,partnerId:101,title:"15% en el desayuno para viajeros",validUntil:inDays(45),status:"pending"},
    {id:201,partnerId:101,title:"2x1 en café de grano hasta las 12:00",description:"Muestra la app en la caja.",validUntil:inDays(20),status:"published"},
  ],
  benefits:[
    {id:601,title:"Ficha destacada en el mapa",detail:"Tu local aparece primero en su categoría durante el primer mes.",rank:3,status:"published"},
    {id:602,title:"Etiqueta NFC de regalo",detail:"Para que los viajeros dejen su opinión con un toque del teléfono.",rank:2,status:"published"},
    {id:603,title:"Kit de bienvenida para viajeros",rank:1,status:"draft"},
  ],
};

const text=(body:Body,key:string)=>String(body[key]??"").trim();
// The panel only sends statuses that exist for the list it acts on.
const status=(body:Body)=>text(body,"status") as never;
const roleOfType={cliente:"tourist",empresa:"owner",admin:"boss"} as const;
// Mimics the rows api/_routes/admin.ts writes to tbl_auditoria.
const note=(me:string,action:string,table:string,recordId:string|number,extra:{before?:Record<string,unknown>;after?:Record<string,unknown>;reason?:string}={})=>
  store.audit.unshift({id:++lastId,actorId:me,origin:"admin",action,table,recordId:String(recordId),createdAt:new Date().toISOString(),...extra});
const reasonOf=(body:Body)=>{const reason=text(body,"reason");if(reason.length<5)throw new Error("Escribe el motivo (al menos 5 letras).");return reason};

function act(path:string,body:Body,me:string){
  const action=text(body,"action"),id=Number(body.id);
  const business=store.businesses.find((item)=>item.id===Number(body.partnerId));
  if(path==="/api/suggestions"){
    const type=store.users.find((user)=>user.id===me)?.type;
    const role=type?roleOfType[type]:"guest";
    store.suggestions.unshift({id:++lastId,role,message:text(body,"message"),status:"new",created_at:new Date().toISOString()});
    return;
  }
  if(path==="/api/owner-photos"){
    if(action==="request")throw new Error("En la demo no se suben fotos. En el sitio real la foto queda pendiente hasta que el equipo la aprueba.");
    if(business&&action==="remove")business.photos=business.photos.filter((item)=>item.path!==text(body,"path"));
    return;
  }
  if(path==="/api/owner"&&business){
    if(action==="set-active"){business.active=Boolean(body.active);business.activeUntil=business.active?new Date(Date.now()+12*HOUR).toISOString():undefined}
    if(action==="update-contact")Object.assign(business,{phone:text(body,"phone")||undefined,whatsapp:text(body,"whatsapp")||undefined,url:text(body,"url")||undefined,address:text(body,"address")||undefined,languages:(body.languages as string[]).map((item)=>item.toUpperCase())});
    if(action==="add-promotion")store.promotions.unshift({id:++lastId,partnerId:business.id,title:text(body,"title"),description:text(body,"description")||undefined,validUntil:text(body,"validUntil"),status:"pending"});
    if(action==="remove-promotion")store.promotions=store.promotions.filter((item)=>item.id!==Number(body.promotionId));
    if(action==="update-listing"){
      const name=text(body,"newCategory");
      if(name){const category={id:`demo-${++lastId}`,names:{es:name},status:"pending"};store.categories.push(category);Object.assign(business,{categoryId:"other",proposedCategoryId:category.id})}
      else Object.assign(business,{categoryId:text(body,"categoryId"),proposedCategoryId:undefined});
      Object.assign(business,{lat:body.lat===""?undefined:Number(body.lat),lng:body.lng===""?undefined:Number(body.lng)});
    }
    if(action==="save-service")saveService(business.id,body);
    if(action==="remove-service")store.services=store.services.filter((item)=>item.id!==Number(body.serviceId));
    return;
  }
  if(path!=="/api/admin")return;
  const user=store.users.find((item)=>item.id===text(body,"userId"));
  if(user){
    const self=user.id===me;
    if(action==="edit-user"){Object.assign(user,{firstName:text(body,"firstName"),country:text(body,"country")});note(me,"editar_perfil","tbl_usuarios",user.id)}
    if(action==="set-type"){
      if(self)throw new Error("No puedes cambiar tu propio tipo de cuenta.");
      if(text(body,"type")==="admin")throw new Error("Solo puede haber una cuenta admin.");
      note(me,"cambiar_tipo","tbl_usuarios",user.id,{before:{tipo_cuenta:user.type},after:{tipo_cuenta:text(body,"type")}});
      user.type=text(body,"type") as typeof user.type;
    }
    if(action==="set-level"){
      const until=text(body,"until");
      note(me,"cambiar_nivel","tbl_usuarios",user.id,{before:{nivel:user.level},after:{nivel:text(body,"level")}});
      Object.assign(user,{level:text(body,"level"),levelUntil:until?new Date(`${until}T23:59:59-03:00`).toISOString():undefined});
    }
    if(action==="set-state"){
      if(self)throw new Error("No puedes cambiar el estado de tu propia cuenta.");
      const state=text(body,"state") as typeof user.state,reason=state==="activo"?undefined:reasonOf(body);
      note(me,state==="activo"?"reactivar":state==="bloqueado"?"bloquear":"desactivar","tbl_usuarios",user.id,{before:{estado:user.state},after:{estado:state},reason});
      Object.assign(user,{state,stateReason:reason,stateAt:new Date().toISOString()});
      if(state==="inactivo")for(const item of store.businesses)if(item.ownerId===user.id)Object.assign(item,{status:"draft",active:false,activeUntil:undefined});
    }
    if(action==="set-rut"){
      const rut=text(body,"rut").replace(/[.\s-]/g,"").toUpperCase();
      if(!/^\d{7,8}[\dK]$/.test(rut))throw new Error("El RUT no es válido. Revisa el dígito verificador.");
      user.rut=`••.•••.${rut.slice(-4,-1)}-${rut.slice(-1)}`;
      note(me,"cargar_rut","tbl_usuarios_privado",user.id,{after:{rut_visible:user.rut}});
    }
    if(action==="remove-rut"){user.rut=undefined;note(me,"quitar_rut","tbl_usuarios_privado",user.id)}
    if(action==="delete-user"){
      if(self)throw new Error("No puedes eliminar tu propia cuenta desde aquí.");
      const reason=reasonOf(body);
      store.users=store.users.filter((item)=>item!==user);
      for(const item of store.businesses)if(item.ownerId===user.id)item.ownerId=undefined;
      note(me,"eliminar_cuenta","tbl_usuarios",user.id,{before:{tipo_cuenta:user.type,nivel:user.level},reason});
    }
  }
  if(user&&(action==="approve-business"||action==="reject-business")){
    const approve=action==="approve-business",reason=approve?undefined:reasonOf(body);
    Object.assign(user,{approval:approve?"aprobada":"rechazada",approvalReason:reason});
    if(approve)for(const item of store.businesses)if(item.ownerId===user.id)item.status="published";
    note(me,approve?"aprobar_empresa":"rechazar_empresa","tbl_usuarios",user.id,{reason});
  }
  if(action==="service-status"){
    const service=store.services.find((item)=>item.id===id),next=status(body) as ManagedService["status"];
    if(next==="rejected"&&text(body,"note").length<5)throw new Error("Escribe el motivo (al menos 5 letras). La empresa lo verá.");
    if(service)Object.assign(service,{status:next,reviewNote:next==="rejected"?text(body,"note"):undefined});
  }
  if(action==="save-level"){
    const level=store.levels.find((item)=>item.code===text(body,"code"));
    const list=(key:string)=>text(body,key).split("\n").map((item)=>item.trim()).filter(Boolean);
    if(level){Object.assign(level,{name:text(body,"name"),monthlyPrice:text(body,"monthlyPrice")?Number(text(body,"monthlyPrice")):null,clientBenefits:list("clientBenefits"),businessBenefits:list("businessBenefits")});note(me,"editar_nivel","tbl_niveles",level.code)}
  }
  if(action==="place-status"){
    const place=store.places.find((item)=>item.id===text(body,"placeId"));
    if(place){place.status=status(body);note(me,place.status==="hidden"?"ocultar_lugar":"publicar_lugar","places",place.id,{reason:text(body,"reason")||undefined})}
  }
  if(action==="delete"){
    const reason=reasonOf(body),kind=text(body,"kind");
    const lists={review:"reviews",suggestion:"suggestions",application:"applications",promotion:"promotions",business:"businesses",service:"services",prospect:"prospects"} as const;
    const tables={review:"reviews",suggestion:"suggestions",application:"business_applications",promotion:"promotions",business:"partners",service:"services",prospect:"company_prospects"} as const;
    const key=kind as keyof typeof lists;
    if(lists[key]){
      (store[lists[key]] as {id:number}[])=(store[lists[key]] as {id:number}[]).filter((item)=>item.id!==id);
      if(key==="business"){store.promotions=store.promotions.filter((item)=>item.partnerId!==id);store.services=store.services.filter((item)=>item.partnerId!==id)}
      note(me,"borrar",tables[key],id,{reason});
    }
  }
  const prospect=store.prospects.find((item)=>item.id===id);
  const category=store.categories.find((item)=>item.id===text(body,"id"));
  if(action==="save-category"){
    const names=body.names as Category["names"];
    if(category)category.names=names;else store.categories.push({id:`demo-${++lastId}`,names,status:"published"});
  }
  if(category&&(action==="approve-category"||action==="merge-category"||action==="reject-category")){
    const target=action==="approve-category"?category.id:action==="merge-category"?text(body,"targetId"):null;
    for(const item of store.businesses)if(item.proposedCategoryId===category.id)Object.assign(item,{proposedCategoryId:undefined,...(target?{categoryId:target}:{})});
    if(action==="approve-category")Object.assign(category,{names:body.names,status:"published"});
    else store.categories=store.categories.filter((item)=>item!==category);
  }
  if(action==="save-prospect"){
    if(text(body,"businessName").length<2)throw new Error("Escribe el nombre de la empresa.");
    const fields={categoryId:text(body,"categoryId"),lat:body.lat===""?undefined:Number(body.lat),lng:body.lng===""?undefined:Number(body.lng),contactName:text(body,"contactName"),contactEmail:text(body,"contactEmail"),contactPhone:text(body,"contactPhone")||undefined,businessName:text(body,"businessName"),kind:"other",region:text(body,"region"),comuna:text(body,"comuna")||undefined,address:text(body,"address")||undefined,whatsapp:text(body,"whatsapp")||undefined,url:text(body,"url")||undefined,languages:(body.languages as string[]).map((item)=>item.toUpperCase()),description:text(body,"description")||undefined,services:body.services as Body[],notes:text(body,"notes")||undefined};
    if(prospect){Object.assign(prospect,fields);savedProspect=prospect.id}
    else{savedProspect=++lastId;store.prospects.unshift({id:savedProspect,status:"prospecto",createdAt:new Date().toISOString(),...fields});note(me,"crear_prospecto","company_prospects",savedProspect)}
  }
  if(action==="invite-company"&&prospect){
    if(prospect.contactName.length<2)throw new Error("Falta el nombre de la persona de contacto.");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prospect.contactEmail))throw new Error("Falta un correo válido para enviar la clave.");
    const userId=`demo-company-${++lastId}`,created=++lastId,at=new Date().toISOString();
    store.users.unshift({id:userId,email:prospect.contactEmail,firstName:prospect.contactName,country:"Chile",type:"empresa",approval:"aprobada",level:"basico",state:"activo",createdAt:at});
    store.businesses.push({id:created,kind:prospect.kind,name:prospect.businessName,region:prospect.region,phone:prospect.contactPhone,whatsapp:prospect.whatsapp,url:prospect.url,address:prospect.address,languages:prospect.languages,status:"published",ownerId:userId,active:false,reviewPlaceId:`partner-${created}`,photos:[]});
    for(const service of prospect.services)saveService(created,service);
    Object.assign(prospect,{status:"invitada",partnerId:created,userId,invitedAt:at});
    note(me,"crear_empresa","tbl_usuarios",userId,{after:{negocio:prospect.businessName}});
  }
  if(action==="resend-invite"&&prospect){prospect.invitedAt=new Date().toISOString();note(me,"reenviar_clave","company_prospects",prospect.id)}
  if(action==="discard-prospect"&&prospect){prospect.status="descartada";note(me,"descartar_prospecto","company_prospects",prospect.id)}
  if(action==="create-business"){
    const created=++lastId;
    store.businesses.push({id:created,kind:text(body,"kind"),name:text(body,"name"),region:text(body,"region"),phone:text(body,"phone")||undefined,url:text(body,"url")||undefined,address:text(body,"address")||undefined,languages:[],status:"draft",active:false,reviewPlaceId:`partner-${created}`,photos:[]});
    store.businesses.sort((a,b)=>a.name.localeCompare(b.name,"es"));
    const application=store.applications.find((item)=>item.id===Number(body.applicationId));
    if(application)application.status="approved";
  }
  if(action==="update-business"&&business){
    if("ownerId" in body)business.ownerId=text(body,"ownerId")||undefined;
    if("placeId" in body){business.placeId=text(body,"placeId")||undefined;business.reviewPlaceId=business.placeId??`partner-${business.id}`}
    if(body.status)business.status=status(body);
    if(body.deactivate){business.active=false;business.activeUntil=undefined}
  }
  const find=<T extends {id:number}>(list:T[])=>list.find((item)=>item.id===id);
  if(action==="application-status"){const item=find(store.applications);if(item)item.status=status(body)}
  if(action==="promotion-status"){const item=find(store.promotions);if(item)item.status=status(body)}
  if(action==="review-status"){const item=find(store.reviews);if(item)item.status=status(body)}
  if(action==="suggestion-status"){const item=find(store.suggestions);if(item)item.status=status(body)}
  if(action==="photo-status"&&business){const item=business.photos.find((photo)=>photo.path===text(body,"path"));if(item)item.status=status(body)}
  if(action==="save-benefit")store.benefits.push({id:++lastId,title:text(body,"title"),detail:text(body,"detail")||null,rank:0,status:"published"});
  if(action==="remove-benefit")store.benefits=store.benefits.filter((item)=>item.id!==id);
}

// Mimics save-service in api/_routes/owner.ts: any saved service goes back to pending.
function saveService(partnerId:number,body:Body){
  const title=text(body,"title"),description=text(body,"description"),price=text(body,"priceClp").replace(/[.\s$]/g,"");
  if(title.length<3)throw new Error("Escribe el nombre del servicio (al menos 3 letras).");
  if(description.length<10)throw new Error("Describe el servicio (al menos 10 letras).");
  const fields={category:text(body,"category") as ManagedService["category"],title,description,priceClp:price?Number(price):undefined,priceFrom:Boolean(price)&&body.priceFrom===true,
    duration:text(body,"duration")||undefined,languages:((body.languages??[]) as string[]).map((item)=>item.toUpperCase()),whatsapp:text(body,"whatsapp")||undefined,phone:text(body,"phone")||undefined,
    bookingUrl:text(body,"bookingUrl")||undefined,status:"pending" as const,reviewNote:undefined,updatedAt:new Date().toISOString()};
  const existing=store.services.find((item)=>item.id===Number(body.serviceId));
  if(existing)Object.assign(existing,fields);
  else store.services.push({id:++lastId,partnerId,photos:[],...fields});
}

function ownerView(me:string):OwnerData{
  return{
    businesses:store.businesses.filter((business)=>business.ownerId===me).map((business)=>({...business,
      promotions:store.promotions.filter((promotion)=>promotion.partnerId===business.id),
      reviews:store.reviews.filter((review)=>review.placeId===business.reviewPlaceId&&review.status==="published"),
      services:store.services.filter((service)=>service.partnerId===business.id),
    })),
    account:{approval:store.users.find((user)=>user.id===me)?.approval??"aprobada"},
    benefits:store.benefits.filter((benefit)=>benefit.status==="published"),
  };
}

function adminView(me:string):AdminData{
  const names=new Map(store.businesses.map((business)=>[business.id,business.name]));
  // Places are searched apart (?places=), like the real route does.
  const rest:Partial<Store>={...store};delete rest.places;
  return{me,...rest as Omit<Store,"places">,services:store.services.map((service)=>({...service,business:names.get(service.partnerId)??""})),promotions:store.promotions.map((promotion)=>({...promotion,business:names.get(promotion.partnerId??0)??""}))};
}

// What /api/promotions would answer for the traveller demo: approved promotions of published businesses in the region.
export async function demoPromotions(region:RegionId):Promise<Promotion[]>{
  await new Promise((done)=>setTimeout(done,200));
  return store.promotions.flatMap((promotion)=>{
    const business=store.businesses.find((item)=>item.id===promotion.partnerId);
    return promotion.status==="published"&&business?.status==="published"&&business.region===region
      ?[{id:promotion.id,title:promotion.title,description:promotion.description,validUntil:promotion.validUntil,business:{name:business.name,address:business.address,active:business.active}}]:[];
  });
}

// What /api/services would answer for the traveller demo: published services of published businesses in the region.
// What /api/categories would answer: the published ones.
export async function demoCategories():Promise<Category[]>{
  return store.categories.filter((item)=>item.status==="published");
}

export async function demoServices(region:RegionId):Promise<Service[]>{
  await new Promise((done)=>setTimeout(done,200));
  return store.services.flatMap((service)=>{
    const business=store.businesses.find((item)=>item.id===service.partnerId);
    if(service.status!=="published"||business?.status!=="published"||business.region!==region)return [];
    const {id,category,title,description,priceClp,priceFrom,duration,languages,whatsapp,phone,bookingUrl}=service;
    return [{id,category,title,description,priceClp,priceFrom,duration,languages,whatsapp,phone,bookingUrl,photos:service.photos.map((item)=>item.url),business:{id:business.id,name:business.name,address:business.address,active:business.active}}];
  });
}

// `token` is the demo account's id (demo-owner, demo-boss, demo-tourist).
export async function demoApi(token:string,path:string,body?:Body):Promise<unknown>{
  await new Promise((done)=>setTimeout(done,200));
  const [route,query=""]=path.split("?");
  if(body)act(route,body,token);
  const params=new URLSearchParams(query);
  if(route==="/api/admin"&&params.has("places")){
    const words=(params.get("places")??"").toLowerCase(),region=params.get("region")??"";
    return structuredClone({places:store.places.filter((place)=>(!words||place.name.toLowerCase().includes(words))&&(!region||place.region===region))});
  }
  if(route==="/api/owner")return structuredClone(ownerView(token));
  // Besides the whole view, what save-prospect and invite-company answer in the real route.
  if(route==="/api/admin")return structuredClone({...adminView(token),id:savedProspect,mailed:true});
  return{ok:true};
}
