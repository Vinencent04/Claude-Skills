import React from "react";
import { Composition, registerRoot } from "remotion";
import { KitchenShort, KITCHEN_FRAMES } from "./videos/kitchen/Kitchen";
const Root: React.FC = () => React.createElement(Composition, { id: "Kitchen", component: KitchenShort, durationInFrames: KITCHEN_FRAMES, fps: 30, width: 1080, height: 1920 });
registerRoot(Root);
