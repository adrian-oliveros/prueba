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
camera.position.set(0, 0, 0); // La cámara es el origen inicial (0,0,0)

// Iluminación
const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(2, 5, 5);
scene.add(directionalLight);

let model = null;
let mixer = null;
let hasSpawned = false;
const clock = new THREE.Clock();

// Cargar el modelo 3D
log("Cargando modelo 3D...");
const loader = new GLTFLoader();
loader.load(
    "./model.glb",
    (gltf) => {
        model = gltf.scene;
        model.scale.set(0.3, 0.3, 0.3);

        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
            });
            log("Animaciones listas.");
        }

        log("Modelo listo. Escaneando QR...");
    },
    undefined,
    (err) => log("Error cargando modelo: " + err.message)
);

// Iniciar cámara web
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;
        await video.play();
        log("Cámara activa. Enfoca el QR...");
    } catch (err) {
        log("Error de cámara: " + err.message);
    }
}

// Convertir las coordenadas 2D del QR en la pantalla a un punto 3D en el mundo real
function calculateQRWorldPosition(location) {
    // 1. Obtener el centro del QR en píxeles (x, y)
    const centerX = (location.topLeftCorner.x + location.topRightCorner.x + location.bottomRightCorner.x + location.bottomLeftCorner.x) / 4;
    const centerY = (location.topLeftCorner.y + location.topRightCorner.y + location.bottomRightCorner.y + location.bottomLeftCorner.y) / 4;

    // 2. Convertir coordenadas a Normalized Device Coordinates (NDC) [-1 a +1]
    const ndcX = (centerX / video.videoWidth) * 2 - 1;
    const ndcY = -(centerY / video.videoHeight) * 2 + 1;

    // 3. Estimar la distancia (Z) según el tamaño del QR en pantalla
    const side1 = Math.hypot(location.topRightCorner.x - location.topLeftCorner.x, location.topRightCorner.y - location.topLeftCorner.y);
    const side2 = Math.hypot(location.bottomRightCorner.x - location.bottomLeftCorner.x, location.bottomRightCorner.y - location.bottomLeftCorner.y);
    const avgWidth = (side1 + side2) / 2;

    // Supeditamos la distancia focal aproximada (factor empírico constante para cámaras de móvil)
    const estimatedDistance = Math.max(0.8, Math.min(3.5, (video.videoWidth * 0.18) / avgWidth));

    // 4. Proyectar el rayo desde la cámara
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
    vector.unproject(camera);
    vector.sub(camera.position).normalize();

    // 5. Calcular la posición 3D final multiplicando por la distancia estimada
    const worldPos = camera.position.clone().add(vector.multiplyScalar(estimatedDistance));

    return worldPos;
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
        log("¡QR Detectado! Calculando posición espacial...");

        // Obtener las coordenadas tridimensionales
        const spawnPosition = calculateQRWorldPosition(code.location);

        // Posicionar el perro en las coordenadas exactas calculadas
        model.position.copy(spawnPosition);

        // Hacer que el perro mire hacia la cámara en el momento del nacimiento
        model.lookAt(camera.position.x, model.position.y, camera.position.z);

        scene.add(model);
        hasSpawned = true;

        log("¡Perro fijado en el espacio físico!");
        setTimeout(() => {
            const debugLog = document.getElementById("debug-log");
            if (debugLog) debugLog.style.display = "none";
        }, 3000);
    }
}

// Bucle de renderizado
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (!hasSpawned) {
        scanQR();
    }

    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

startCamera();
animate();
