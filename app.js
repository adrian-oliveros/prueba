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

        // Primero lo colocamos en el QR
        anchor.group.add(model);

        // ------------------------------------------------
        // CUANDO SE DETECTA EL QR POR PRIMERA VEZ
        // ------------------------------------------------
        let detached = false;

        anchor.onTargetFound = () => {

            // Solo lo hacemos una vez
            if (detached) return;

            detached = true;

            /*
             * Sacamos el avión del anchor.
             *
             * THREE.attach() conserva automáticamente
             * su posición, rotación y escala en el mundo.
             *
             * A partir de aquí el avión YA NO depende
             * del tracking del QR.
             */
            scene.attach(model);

            console.log("Avión liberado del tracking del QR");
        };

        // ------------------------------------------------
        // ANIMACIONES DEL GLB
        // ------------------------------------------------

        let mixer = null;

        if (gltf.animations && gltf.animations.length > 0) {

            mixer = new THREE.AnimationMixer(model);

            gltf.animations.forEach((clip) => {

                const action = mixer.clipAction(clip);

                action.play();
            });
        }

        // Reloj independiente del tracking
        const clock = new THREE.Clock();

        renderer.setAnimationLoop(() => {

            const delta = clock.getDelta();

            // La animación continúa aunque el avión
            // esté fuera del encuadre.
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
