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

// Iluminación reforzada (luz ambiental + direccional)
const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(1, 4, 3);
scene.add(directionalLight);

// Anchor tracking del objetivo
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

        // Escala del modelo
        model.scale.set(0.3, 0.3, 0.3);

        // Inicializar animaciones de GLTF
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }

        // Se vincula inicialmente al anchor para que MindAR lo gestione durante el escaneo
        anchor.group.add(model);
        console.log("Modelo .glb cargado en memoria correctamente.");
    },
    undefined,
    (error) => {
        console.error("Error al cargar el archivo model.glb:", error);
    }
);

// Evento: Al detectar el objetivo QR
anchor.onTargetFound = () => {
    if (!model || hasSpawned) return;

    // Retardamos la extracción 2 frames para dar tiempo a que MindAR actualice la pose de la cámara y del anchor
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Forzar la actualización explícita de las matrices del mundo
            scene.updateMatrixWorld(true);
            anchor.group.updateMatrixWorld(true);

            const worldPosition = new THREE.Vector3();
            const worldQuaternion = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();

            // Extraer transformación del anchor
            anchor.group.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

            // Trasladar el perro a la escena global para independizarlo del QR
            scene.add(model);

            // Asignar posición y rotación globales retenidas
            model.position.copy(worldPosition);
            model.quaternion.copy(worldQuaternion);
            
            // Forzar visibilidad activa
            model.visible = true;

            hasSpawned = true;
            console.log("¡Perrete instanciado con éxito en el espacio mundo!", model.position);
        });
    });
};

anchor.onTargetLost = () => {
    // El perrete permanece en 'scene', no se elimina ni se oculta al perder el QR
};

// Bucle de renderizado
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
});

// Iniciar sesión AR
await mindarThree.start();
