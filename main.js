import { Lightship } from "https://webxr.run/lightship/latest/lightship.module.js";

const canvas = document.getElementById("xr-canvas");

async function start() {
  const xr = await Lightship.create({
    canvas,
    features: ["world-tracking"],
  });

  const model = await xr.loadModel("./model.glb");

  model.position.set(0, 0, -1);
  xr.scene.add(model);

  xr.onUpdate(() => {
    model.rotation.y += 0.01;
  });

  xr.start();
}

start();

