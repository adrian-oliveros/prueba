import { Lightship } from "./lightship.module.js";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";

const canvas = document.getElementById("xr-canvas");

// Inicializar Lightship
const xr = await Lightship.create({
    canvas,
    features: ["hit-test", "meshing"],
});

// Escena Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Luz
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// Cargar modelo
const loader = new GLTFLoader();
let model;

loader.load(
    "./model.glb",
    (gltf) => {
        model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);
        model.visible = false;
        scene.add(model);
    },
    undefined,
    (error) => {
        console.error("Error cargando GLB:", error);
    }
);

// Colocar modelo con hit-test
xr.session.addEventListener("select", (event) => {
    const pose = xr.getHitTestPose(event.frame);
    if (pose && model) {
        model.position.copy(pose.transform.position);
        model.quaternion.copy(pose.transform.orientation);
        model.visible = true;
    }
});

// Loop de render
xr.session.requestAnimationFrame(function onXRFrame(t, frame) {
    xr.session.requestAnimationFrame(onXRFrame);
    renderer.render(scene, camera);
});
