import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

const container = document.querySelector("#ar-container");

const mindarThree = new MindARThree({
    container: container,
    imageTargetSrc: "./qr.mind",
    maxTrack: 1,
    uiLoading: "yes",
    uiScanning: "yes",
    uiError: "yes"
});

const { renderer, scene, camera } = mindarThree;

// Luz básica
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
scene.add(light);

// Anchor del QR
const anchor = mindarThree.addAnchor(0);

// Objeto persistente en el mundo (no desaparece)
const worldObject = new THREE.Group();
scene.add(worldObject);

// Cargar modelo
const loader = new GLTFLoader();
let model = null;
let mixer = null;

loader.load(
    "./model.glb",

    (gltf) => {
        model = gltf.scene;

        model.scale.set(0.3, 0.3, 0.3);
        model.position.set(0, 0, 0.1);

        // Animaciones
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }
    },

    undefined,

    (error) => {
        console.error("Error cargando model.glb:", error);
    }
);

// Cuando el QR se detecta → el perro aparece EXACTAMENTE en el QR
anchor.onTargetFound = () => {
    if (!model) return;

    // Esperar 1 frame para que MindAR actualice la posición real del QR
    requestAnimationFrame(() => {

        const qrWorldPosition = new THREE.Vector3();
        anchor.group.getWorldPosition(qrWorldPosition);

        const qrWorldQuaternion = new THREE.Quaternion();
        anchor.group.getWorldQuaternion(qrWorldQuaternion);

        worldObject.position.copy(qrWorldPosition);
        worldObject.quaternion.copy(qrWorldQuaternion);

        if (!scene.children.includes(model)) {
            scene.add(model);
        }

        model.position.copy(worldObject.position);
        model.quaternion.copy(worldObject.quaternion);

        console.log("Perro spawneado en el QR:", model.position);
    });
};

// Cuando el QR se pierde → NO ocultamos nada
anchor.onTargetLost = () => {
    // El perro sigue en la escena
};

// Render loop global
let previousTime = 0;

renderer.setAnimationLoop(() => {
    const currentTime = performance.now() / 1000;
    const delta = currentTime - previousTime;
    previousTime = currentTime;

    if (mixer) mixer.update(delta);

    renderer.render(scene, camera);
});

// Iniciar AR
await mindarThree.start();
