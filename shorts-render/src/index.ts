import React from "react";
import { Composition, registerRoot } from "remotion";
import { KitchenShort, KITCHEN_FRAMES } from "./videos/kitchen/Kitchen";
import { RevoShort, REVO_FRAMES } from "./videos/revo/Revo";
import { BeerfloodShort, BEERFLOOD_FRAMES } from "./videos/beerflood/Beerflood";
import { Subs, SUBS_FRAMES } from "./videos/subs/Subs";
const C = (id: string, component: React.FC, d: number) => React.createElement(Composition, { id, component, durationInFrames: d, fps: 30, width: 1080, height: 1920 });
const Root: React.FC = () => React.createElement(React.Fragment, null, C("Kitchen", KitchenShort, KITCHEN_FRAMES), C("Revo", RevoShort, REVO_FRAMES), C("Beerflood", BeerfloodShort, BEERFLOOD_FRAMES), C("Subs", Subs, SUBS_FRAMES));
registerRoot(Root);
