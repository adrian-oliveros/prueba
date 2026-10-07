import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const logEl = document.getElementById("debug-log");
function log(msg) {
    console.log(msg);
    if (logEl) logEl.innerHTML += "<br>> " + msg;
}

const video = document.getElementById("webcam");
const canvas3d = document.getElementById("canvas3d");

// Canvas auxiliar en memoria para analizar los frames del QR
const scanCanvas = document.createElement("canvas");
const scanCtx = scanCanvas.getContext("2d");

// Configuración de Three.js
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

// Iluminación para que el modelo se vea perfecto
const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(2, 5, 5);
scene.add(directionalLight);

let model = null;
let mixer = null;
let hasSpawned = false;
const clock = new THREE.Clock();

// Cargar el perrete
log("Cargando modelo 3D...");
const loader = new GLTFLoader();
loader.load(
    "./model.glb",
    (gltf) => {
        model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);

        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
            });
            log("Animaciones listas.");
        }

        log("Modelo cargado. Enfoca cualquier QR...");
    },
    undefined,
    (err) => log("Error cargando modelo: " + err.message)
);

// Iniciar cámara web estándar directamente (sin librerías que inyecten botones)
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;
        await video.play();
        log("Cámara activa. Escaneando fotogramas...");
    } catch (err) {
        log("Error al acceder a la cámara: " + err.message);
    }
}

// Escáner continuo de QR
function scanQR() {
    if (hasSpawned || !model || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    scanCanvas.width = video.videoWidth;
    scanCanvas.height = video.videoHeight;
    scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);

    const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        log("¡QR Detectado! Haciendo nacer al perro...");

        // Colocar al perro frente a la cámara en el centro de la escena 3D
        model.position.set(0, -0.5, -2);
        model.rotation.y = 0;
        scene.add(model);

        hasSpawned = true;
        log("¡El perro ha nacido y permanecerá aquí siempre!");
    }
}

// Bucle principal de renderizado
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    // Si aún no ha nacido, seguimos escaneando la cámara
    if (!hasSpawned) {
        scanQR();
    }

    renderer.render(scene, camera);
}

// Ajuste al redimensionar pantalla
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Arrancar proceso
startCamera();
animate();
