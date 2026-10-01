import { motion, useReducedMotion } from "motion/react";
import { KeyboardEvent } from "react";
import chileMap from "./data/chile-map.json";
import { Destination, destinations, RegionId, regionById, ZoneId, zoneById } from "./chile-regions";

type Box = [number,number,number,number];
type Props = {
  zone:ZoneId|null;
  region:RegionId|null;
  horizontal:boolean;
  islandsLabel:string;
  onRegion:(id:RegionId)=>void;
  onDestination:(destination:Destination)=>void;
  onIslands:()=>void;
  onHover:(label:string|null)=>void;
};

const { width:W, height:H, projection } = chileMap;
const shapes = chileMap.regions as { id:RegionId; d:string; bbox:number[]; center:number[] }[];
const INSET:Box = [-78,296,-14,372];
const FULL:Box = [-90,-12,W+12,H+12];
const merc = (lat:number) => Math.log(Math.tan(Math.PI/4+(lat*Math.PI)/360));

function project([lat,lon]:[number,number]):[number,number] {
  return [(lon-projection.lon0)*projection.k*Math.PI/180,(merc(projection.latN)-merc(lat))*projection.k];
}

function boxFor(zone:ZoneId|null):Box {
  if(!zone) return FULL;
  if(zone==="islas") return [INSET[0]-30,INSET[1]-60,W*.75,INSET[3]+60];
  const boxes=shapes.filter((shape)=>zoneById(zone).regions.includes(shape.id)).map((shape)=>shape.bbox);
  const box:Box=[Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];
  const pad=Math.max(box[2]-box[0],box[3]-box[1])*.12;
  return [box[0]-pad,box[1]-pad,box[2]+pad,box[3]+pad];
}

const pressable=(action:()=>void)=>({
  role:"button",tabIndex:0,onClick:action,
  onKeyDown:(event:KeyboardEvent)=>{ if(event.key==="Enter"||event.key===" "){event.preventDefault();action()} },
});

export default function ChileMap({zone,region,horizontal,islandsLabel,onRegion,onDestination,onIslands,onHover}:Props) {
  const reduced=useReducedMotion();
  const box=boxFor(zone);
  // Phones show the country lying down, north to the left: (x,y) -> (y, W-x).
  const view=horizontal?[box[1],W-box[2],box[3]-box[1],box[2]-box[0]]:[box[0],box[1],box[2]-box[0],box[3]-box[1]];
  const dot=Math.max(box[2]-box[0],box[3]-box[1])*.008;
  const zoneRegions=zone&&zone!=="islas"?zoneById(zone).regions:null;
  const dots=destinations.filter((destination)=>!destination.island&&(!zoneRegions||zoneRegions.includes(destination.region)));

  return (
    <motion.svg className="chile-map" role="group" aria-label="Chile" preserveAspectRatio="xMidYMid meet"
      initial={false} animate={{viewBox:view.join(" ")}} transition={{duration:reduced?0:.7,ease:[.22,.8,.2,1]}}>
      <g transform={horizontal?`translate(0 ${W}) rotate(-90)`:undefined}>
        {[100,300,500,700,900].map((y)=><line key={y} className="chile-latitude" x1={-90} x2={W+12} y1={y} y2={y}/>)}
        {shapes.map((shape,index)=>{
          const info=regionById(shape.id);
          const state=region===shape.id?"active":zoneRegions?(zoneRegions.includes(shape.id)?"in-zone":"dim"):"";
          return <motion.path key={shape.id} d={shape.d} className={`chile-region ${state}`} aria-label={info.name} aria-pressed={region===shape.id}
            initial={reduced?false:{opacity:0}} animate={{opacity:1}} transition={{delay:reduced?0:.15+index*.06,duration:.45}}
            onMouseEnter={()=>onHover(info.name)} onMouseLeave={()=>onHover(null)} onFocus={()=>onHover(info.name)} onBlur={()=>onHover(null)}
            {...pressable(()=>onRegion(shape.id))}/>;
        })}
        <g className={`chile-islands ${zone==="islas"?"active":""}`} aria-label={islandsLabel} aria-pressed={zone==="islas"}
          onMouseEnter={()=>onHover(islandsLabel)} onMouseLeave={()=>onHover(null)} onFocus={()=>onHover(islandsLabel)} onBlur={()=>onHover(null)} {...pressable(onIslands)}>
          <rect x={INSET[0]} y={INSET[1]} width={INSET[2]-INSET[0]} height={INSET[3]-INSET[1]} rx={8}/>
          <circle cx={-58} cy={322} r={5}/><circle cx={-32} cy={346} r={3.5}/>
        </g>
        {dots.map((destination,index)=>{
          const [x,y]=project(destination.coords);
          return <motion.g key={destination.id} className="chile-dot" aria-label={destination.name}
            initial={reduced?false:{opacity:0}} animate={{opacity:1}} transition={{delay:reduced?0:1.2+index*.03}}
            onMouseEnter={()=>onHover(destination.name)} onMouseLeave={()=>onHover(null)} onFocus={()=>onHover(destination.name)} onBlur={()=>onHover(null)}
            {...pressable(()=>onDestination(destination))}>
            <circle className="chile-dot-pulse" cx={x} cy={y} r={dot*2.2}/>
            <circle className="chile-dot-hit" cx={x} cy={y} r={dot*3}/>
            <circle className="chile-dot-core" cx={x} cy={y} r={dot}/>
          </motion.g>;
        })}
      </g>
    </motion.svg>
  );
}
