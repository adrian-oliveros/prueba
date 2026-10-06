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

// Luz
const light = new THREE.HemisphereLight(
    0xffffff,
    0x444444,
    2
);

scene.add(light);

// Anclaje al QR
const anchor = mindarThree.addAnchor(0);

// Cargar avión
const loader = new GLTFLoader();

loader.load(
    "./model.glb",

    (gltf) => {

        const model = gltf.scene;

        model.scale.set(
            0.3,
            0.3,
            0.3
        );

        model.position.set(
            0,
            0,
            0.1
        );

        anchor.group.add(model);

        // Animaciones del GLB
        if (gltf.animations && gltf.animations.length > 0) {

            const mixer = new THREE.AnimationMixer(model);

            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });

            let previousTime = 0;

            renderer.setAnimationLoop(() => {

                const currentTime = performance.now() / 1000;

                const delta = currentTime - previousTime;
                previousTime = currentTime;

                mixer.update(delta);

                renderer.render(scene, camera);
            });

        } else {

            renderer.setAnimationLoop(() => {
                renderer.render(scene, camera);
            });
        }
    },

    undefined,

    (error) => {
        console.error("Error cargando model.glb:", error);
    }
);

// Iniciar AR
await mindarThree.start();
