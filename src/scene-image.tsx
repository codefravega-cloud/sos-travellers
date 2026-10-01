import type { ZoneId } from "./chile-regions";

export type SceneId = "desierto"|"centro"|"sur"|"patagonia"|"mar"|"nieve";

const zoneScene:Record<ZoneId,SceneId> = { "norte-grande":"desierto", "norte-chico":"desierto", centro:"centro", sur:"sur", patagonia:"patagonia", islas:"mar" };

// Snowy weather wins over the zone; with no zone picked ("Todo Chile") the coast stands in for the whole country.
export const sceneFor=(zone:ZoneId|null,kind:string):SceneId=>kind==="snow"?"nieve":zone?zoneScene[zone]:"mar";

// One still per scene in public/images/scenes/<scene>.jpg; CSS adds a slow drift so it does not feel frozen.
export default function SceneImage({scene}:{scene:SceneId}) {
  return <div key={scene} className="scene-image" style={{backgroundImage:`url(/images/scenes/${scene}.jpg)`}}/>;
}
