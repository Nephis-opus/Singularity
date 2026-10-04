import { TextPathStudies } from "./TextPathStudies";
import "../threeui.css";

export function Scene() {
  return (
    <div className="shader-frame">
      <TextPathStudies
        mode="light"
        scale={1.00}
        opacity={1.00}
        hue={0}
        saturation={1.00}
        brightness={1.00}
      />
    </div>
  );
}
