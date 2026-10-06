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

        // IMPORTANTE:
        // El avión pertenece directamente a la escena,
        // NO al anchor.
        scene.add(model);

        // Al principio está oculto
        model.visible = false;

        // Animaciones del GLB
        let mixer = null;

        if (gltf.animations && gltf.animations.length > 0) {

            mixer = new THREE.AnimationMixer(model);

            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }

        let flightStarted = false;

        const clock = new THREE.Clock();

        renderer.setAnimationLoop(() => {

            const delta = clock.getDelta();

            // El QR solamente sirve para colocar
            // el avión la primera vez.
            if (!flightStarted && anchor.visible) {

                model.position.copy(anchor.group.position);
                model.quaternion.copy(anchor.group.quaternion);

                model.visible = true;

                flightStarted = true;
            }

            // La animación del GLB continúa aunque
            // el QR deje de detectarse.
            if (mixer) {
                mixer.update(delta);
            }

            renderer.render(scene, camera);
        });
    },

    undefined,

    (error) => {
        console.error("Error cargando model.glb:", error);
    }
);

// Iniciar AR
await mindarThree.start();
