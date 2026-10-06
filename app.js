```javascript
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

// Contenedor independiente del tracking
const flightRoot = new THREE.Group();
scene.add(flightRoot);

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

        // El avión NO pertenece al anchor
        flightRoot.add(model);

        // Animaciones del GLB
        let mixer = null;

        if (gltf.animations && gltf.animations.length > 0) {

            mixer = new THREE.AnimationMixer(model);

            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }

        // Indica si ya hemos fijado la posición inicial
        let flightStarted = false;

        const clock = new THREE.Clock();

        renderer.setAnimationLoop(() => {

            const delta = clock.getDelta();

            // Mientras el QR se está viendo,
            // usamos su posición SOLO para colocar
            // el avión inicialmente.
            if (!flightStarted && anchor.visible) {

                anchor.group.updateWorldMatrix(true, false);

                anchor.group.getWorldPosition(
                    flightRoot.position
                );

                anchor.group.getWorldQuaternion(
                    flightRoot.quaternion
                );

                flightStarted = true;
            }

            // La animación continúa SIEMPRE
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
```
