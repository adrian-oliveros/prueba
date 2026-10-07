import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

const container = document.querySelector("#ar-container");

// Inicializar MindAR
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
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(1, 2, 3);
scene.add(directionalLight);

// Anchor tracking del objetivo (índice 0)
const anchor = mindarThree.addAnchor(0);

// Carga de modelo y animaciones
const loader = new GLTFLoader();
let model = null;
let mixer = null;
let hasSpawned = false; // Control de primera aparición

const clock = new THREE.Clock();

loader.load(
    "./model.glb",
    (gltf) => {
        model = gltf.scene;

        // Escala global del perro
        model.scale.set(0.3, 0.3, 0.3);

        // Inicializar animaciones de GLTF
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }

        // Añadimos inicialmente el modelo al anchor de MindAR
        anchor.group.add(model);
    },
    undefined,
    (error) => {
        console.error("Error al cargar el archivo model.glb:", error);
    }
);

// Evento: Al detectar el objetivo QR por primera vez
anchor.onTargetFound = () => {
    if (!model) return;

    // Si aún no ha "nacido", fijamos su posición en el mundo
    if (!hasSpawned) {
        // Esperamos al siguiente frame para asegurarnos de que la pose del tracking está actualizada
        requestAnimationFrame(() => {
            const worldPosition = new THREE.Vector3();
            const worldQuaternion = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();

            // Extraer la posición, rotación y escala globales del anchor en el instante de detección
            anchor.group.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

            // Desvincular el modelo del anchor y pasarlo a la escena global
            scene.add(model);

            // Asignar las coordenadas globales retenidas
            model.position.copy(worldPosition);
            model.quaternion.copy(worldQuaternion);

            hasSpawned = true;
            console.log("¡El perrete ha nacido en las coordenadas del QR!");
        });
    }
};

// Evento: Al perder de vista el objetivo QR
anchor.onTargetLost = () => {
    // No eliminamos ni ocultamos el objeto. Al estar colgado directamente de 'scene',
    // seguirá existiendo en el espacio 3D y reproduciendo su animación independientemente de la cámara.
};

// Bucle de renderizado global
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    // Actualizar animación del perrete
    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
});

// Iniciar sesión AR
await mindarThree.start();
