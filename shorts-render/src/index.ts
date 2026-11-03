import React from "react";
import { Composition, registerRoot } from "remotion";
import { KitchenShort, KITCHEN_FRAMES } from "./videos/kitchen/Kitchen";
import { RevoShort, REVO_FRAMES } from "./videos/revo/Revo";
const C = (id: string, component: React.FC, d: number) => React.createElement(Composition, { id, component, durationInFrames: d, fps: 30, width: 1080, height: 1920 });
const Root: React.FC = () => React.createElement(React.Fragment, null, C("Kitchen", KitchenShort, KITCHEN_FRAMES), C("Revo", RevoShort, REVO_FRAMES));
registerRoot(Root);
