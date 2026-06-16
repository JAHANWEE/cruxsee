import { corsair } from "./packages/corsair/src/index";
console.log(Object.keys(corsair.keys));
console.log(corsair.keys.gmail ? Object.keys(corsair.keys.gmail) : 'no gmail');
console.log(Object.keys(corsair.manage || {}));
