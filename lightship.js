// Lightship WebAR SDK - Loader (local)
// Este archivo expone Lightship como variable global para index.html

import { Lightship } from "./lightship.module.js";

window.Lightship = Lightship;

console.log("Lightship.js cargado y listo.");
