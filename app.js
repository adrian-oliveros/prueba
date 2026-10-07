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

// Iluminación
const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(1, 4, 3);
scene.add(directionalLight);

// Anchor tracking del objetivo (índice 0)
const anchor = mindarThree.addAnchor(0);

// Forzar que el grupo del anchor NUNCA se oculte automáticamente por MindAR
anchor.group.visible = true;

// Carga de modelo y animaciones
const loader = new GLTFLoader();
let model = null;
let mixer = null;
let hasSpawned = false;

const clock = new THREE.Clock();

loader.load(
    "./model.glb",
    (gltf) => {
        model = gltf.scene;

        // Ajustar escala y posición local dentro del anchor
        model.scale.set(0.3, 0.3, 0.3);
        model.position.set(0, 0, 0);

        // Ocultar el modelo inicialmente hasta que se detecte el QR por primera vez
        model.visible = false;

        // Animaciones
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }

        // Añadir el perro dentro del grupo del anchor
        anchor.group.add(model);
        console.log("Modelo .glb cargado correctamente.");
    },
    undefined,
    (error) => {
        console.error("Error al cargar model.glb:", error);
    }
);

// Evento: Al detectar el QR por primera vez
anchor.onTargetFound = () => {
    if (!model) return;

    if (!hasSpawned) {
        hasSpawned = true;
        model.visible = true;
        console.log("¡El perro ha aparecido en el QR!");
    }
};

// Sobrescribir el evento targetLost de MindAR para que NADA se oculte
anchor.onTargetLost = () => {
    if (model && hasSpawned) {
        // Aseguramos que el grupo y el modelo sigan siendo visibles
        anchor.group.visible = true;
        model.visible = true;
    }
};

// Bucle de renderizado global
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    // Mantener la visibilidad activa de forma continua una vez aparecido
    if (hasSpawned && model) {
        anchor.group.visible = true;
        model.visible = true;
    }

    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
});

// Iniciar AR
await mindarThree.start();
