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


// ======================================================
// LUZ
// ======================================================

const light = new THREE.HemisphereLight(
    0xffffff,
    0x444444,
    2
);

scene.add(light);


// ======================================================
// ANCLA DEL QR
// ======================================================

const anchor = mindarThree.addAnchor(0);


// ======================================================
// CONTENEDOR INDEPENDIENTE DEL QR
// ======================================================
//
// IMPORTANTE:
// Este objeto NO pertenece al anchor de MindAR.
// Por eso MindAR nunca podrá ocultarlo cuando pierda
// el QR.
//

const flightRoot = new THREE.Group();

scene.add(flightRoot);


// ======================================================
// CARGAR AVIÓN
// ======================================================

const loader = new GLTFLoader();

loader.load(
    "./model.glb",

    (gltf) => {

        const model = gltf.scene;


        // --------------------------------------------------
        // ESCALA
        // --------------------------------------------------

        model.scale.set(
            0.3,
            0.3,
            0.3
        );


        // --------------------------------------------------
        // POSICIÓN INICIAL RESPECTO AL QR
        // --------------------------------------------------

        model.position.set(
            0,
            0,
            0.1
        );


        // --------------------------------------------------
        // EL AVIÓN PERTENECE AL CONTENEDOR INDEPENDIENTE
        // --------------------------------------------------

        flightRoot.add(model);


        // ==================================================
        // ANIMACIÓN DEL GLB
        // ==================================================

        let mixer = null;

        if (
            gltf.animations &&
            gltf.animations.length > 0
        ) {

            mixer = new THREE.AnimationMixer(model);

            gltf.animations.forEach((clip) => {

                const action = mixer.clipAction(clip);

                action.play();

            });

        }


        // ==================================================
        // RELOJ DE ANIMACIÓN
        // ==================================================

        const clock = new THREE.Clock();


        // ==================================================
        // BUCLE PRINCIPAL
        // ==================================================

        renderer.setAnimationLoop(() => {

            const delta = clock.getDelta();


            // ------------------------------------------------
            // 1. SI EL QR ESTÁ VISIBLE
            // ------------------------------------------------
            //
            // Copiamos la posición del QR al flightRoot.
            //
            // El avión NO está dentro del anchor.
            //

            if (anchor.visible) {

                anchor.group.updateWorldMatrix(
                    true,
                    false
                );

                anchor.group.getWorldPosition(
                    flightRoot.position
                );

                anchor.group.getWorldQuaternion(
                    flightRoot.quaternion
                );

                anchor.group.getWorldScale(
                    flightRoot.scale
                );

            }


            // ------------------------------------------------
            // 2. ANIMACIÓN DEL AVIÓN
            // ------------------------------------------------
            //
            // Esto continúa SIEMPRE.
            //
            // Da igual si:
            // - el QR está visible
            // - el QR se ha perdido
            // - el avión está dentro de pantalla
            // - el avión está fuera de pantalla
            //

            if (mixer) {

                mixer.update(delta);

            }


            // ------------------------------------------------
            // 3. RENDER
            // ------------------------------------------------

            renderer.render(
                scene,
                camera
            );

        });

    },


    undefined,


    (error) => {

        console.error(
            "Error cargando model.glb:",
            error
        );

    }
);


// ======================================================
// INICIAR AR
// ======================================================

await mindarThree.start();
```
