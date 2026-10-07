import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

const container = document.querySelector("#ar-container");

// Inicialización de MindAR
const mindarThree = new MindARThree({
    container: container,
    imageTargetSrc: "./qr.mind",
    maxTrack: 1,
    uiLoading: "yes",
    uiScanning: "yes",
    uiError: "yes"
});

const { renderer, scene, camera } = mindarThree;

// Iluminación completa
const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(1, 4, 3);
scene.add(directionalLight);

// Anchor del QR (Índice 0)
const anchor = mindarThree.addAnchor(0);

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

        // Ajuste de escala inicial
        model.scale.set(0.3, 0.3, 0.3);

        // Inicializar animaciones GLTF
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }

        // Lo añadimos temporalmente al anchor para el primer encuadre
        anchor.group.add(model);
        model.visible = false; // Permanece oculto hasta escaneo
    },
    undefined,
    (error) => console.error("Error al cargar model.glb:", error)
);

// Evento: Al detectar el QR por primera vez
anchor.onTargetFound = () => {
    if (!model || hasSpawned) return;

    // Esperar a que la cámara posicione correctamente el objeto
    requestAnimationFrame(() => {
        // 1. Forzar la actualización de las matrices tridimensionales
        anchor.group.updateMatrixWorld(true);

        // 2. Extraer la posición y rotación exactas en el espacio del MUNDO
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();

        anchor.group.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

        // 3. Mover el perro directamente a la ESCENA GLOBAL
        scene.add(model);

        // 4. Aplicar la posición guardada
        model.position.copy(worldPosition);
        model.quaternion.copy(worldQuaternion);
        model.scale.copy(worldScale);
        model.visible = true;

        // 5. Bloquear para que no vuelva a recalcularse
        hasSpawned = true;

        console.log("¡Perro instanciado de forma permanente en el mundo!", model.position);
    });
};

// Evitar que MindAR oculte cosas al perder el QR
anchor.onTargetLost = () => {
    if (model && hasSpawned) {
        model.visible = true;
    }
};

// Bucle de renderizado
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    // Actualizar animación
    if (mixer) {
        mixer.update(delta);
    }

    // Forzar visibilidad del modelo si ya ha nacido
    if (hasSpawned && model) {
        model.visible = true;
    }

    renderer.render(scene, camera);
});

// Iniciar sesión AR
await mindarThree.start();
