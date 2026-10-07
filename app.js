import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

const logEl = document.getElementById("debug-log");
function log(msg) {
    console.log(msg);
    if (logEl) logEl.innerHTML += "<br>> " + msg;
}

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

// Iluminación intensa
const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
directionalLight.position.set(0, 10, 10);
scene.add(directionalLight);

// Anchor del QR
const anchor = mindarThree.addAnchor(0);

// CUBO DE PRUEBA (Para descartar si el QR rastrea)
const debugGeo = new THREE.SphereGeometry(0.2, 16, 16);
const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
const debugMesh = new THREE.Mesh(debugGeo, debugMat);
anchor.group.add(debugMesh);

// Carga de modelo y animaciones
const loader = new GLTFLoader();
let model = null;
let mixer = null;
let hasSpawned = false;

const clock = new THREE.Clock();

log("Cargando model.glb...");

loader.load(
    "./model.glb",
    (gltf) => {
        model = gltf.scene;
        log("¡Modelo GLTF cargado con éxito!");

        // Escala normalizada
        model.scale.set(0.5, 0.5, 0.5);

        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
            log("Animaciones iniciadas: " + gltf.animations.length);
        }

        anchor.group.add(model);
        model.visible = false;
    },
    undefined,
    (error) => {
        log("ERROR cargando model.glb: " + error.message);
    }
);

anchor.onTargetFound = () => {
    log("¡QR Detectado!");
    if (!model || hasSpawned) return;

    requestAnimationFrame(() => {
        anchor.group.updateMatrixWorld(true);

        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();

        anchor.group.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

        scene.add(model);

        model.position.copy(worldPosition);
        model.quaternion.copy(worldQuaternion);
        model.visible = true;

        hasSpawned = true;
        log("Perro instanciado en posición fija.");
    });
};

anchor.onTargetLost = () => {
    log("QR perdido de vista.");
    if (model && hasSpawned) {
        model.visible = true;
    }
};

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (hasSpawned && model) model.visible = true;
    renderer.render(scene, camera);
});

mindarThree.start().then(() => {
    log("MindAR iniciado correctamente.");
}).catch((err) => {
    log("ERROR al iniciar MindAR: " + err);
});
