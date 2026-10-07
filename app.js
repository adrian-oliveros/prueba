import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DeviceOrientationControls } from "three/addons/controls/DeviceOrientationControls.js";

const logEl = document.getElementById("debug-log");
function log(msg) {
    console.log(msg);
    if (logEl) logEl.innerHTML += "<br>> " + msg;
}

const video = document.getElementById("webcam");
const canvas3d = document.getElementById("canvas3d");

const scanCanvas = document.createElement("canvas");
const scanCtx = scanCanvas.getContext("2d");

// Configuración de Renderizador y Escena
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0);

// Controles por Giroscopio para vincular el móvil con la cámara 3D
let controls = new DeviceOrientationControls(camera);

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

// Carga del modelo 3D
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

        log("Cargado. Escaneando QR con orientación física...");
    },
    undefined,
    (err) => log("Error cargando modelo: " + err.message)
);

// Iniciar cámara
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;
        await video.play();

        // Pedir permiso de giroscopio en iOS (si aplica)
        if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
            DeviceOrientationEvent.requestPermission().then(response => {
                if (response === "granted") {
                    controls.connect();
                }
            }).catch(console.error);
        } else {
            controls.connect();
        }

        log("Cámara y giroscopio conectados.");
    } catch (err) {
        log("Error de cámara: " + err.message);
    }
}

// Calcular posición real en 3D teniendo en cuenta hacia dónde apunta el giroscopio
function calculateQRWorldPosition(location) {
    const centerX = (location.topLeftCorner.x + location.topRightCorner.x + location.bottomRightCorner.x + location.bottomLeftCorner.x) / 4;
    const centerY = (location.topLeftCorner.y + location.topRightCorner.y + location.bottomRightCorner.y + location.bottomLeftCorner.y) / 4;

    const ndcX = (centerX / video.videoWidth) * 2 - 1;
    const ndcY = -(centerY / video.videoHeight) * 2 + 1;

    const side1 = Math.hypot(location.topRightCorner.x - location.topLeftCorner.x, location.topRightCorner.y - location.topLeftCorner.y);
    const side2 = Math.hypot(location.bottomRightCorner.x - location.bottomLeftCorner.x, location.bottomRightCorner.y - location.bottomLeftCorner.y);
    const avgWidth = (side1 + side2) / 2;

    const estimatedDistance = Math.max(1.0, Math.min(3.0, (video.videoWidth * 0.2) / avgWidth));

    // Vector en coordenadas de la cámara
    const vector = new THREE.Vector3(ndcX, ndcY, -1).normalize();

    // Transformar el vector según la rotación actual que el giroscopio reporta para la cámara
    vector.applyQuaternion(camera.quaternion);

    // Posición global final en el mundo 3D
    const worldPos = camera.position.clone().add(vector.multiplyScalar(estimatedDistance));

    return worldPos;
}

// Escaneo
function scanQR() {
    if (hasSpawned || !model || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    scanCanvas.width = video.videoWidth;
    scanCanvas.height = video.videoHeight;
    scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);

    const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        log("¡QR Detectado! Fijando perro en el espacio físico...");

        const spawnPosition = calculateQRWorldPosition(code.location);

        model.position.copy(spawnPosition);

        // Hacer que el perro mire hacia el usuario
        model.lookAt(camera.position.x, model.position.y, camera.position.z);

        scene.add(model);
        hasSpawned = true;

        log("¡Perro fijado en el espacio!");
        setTimeout(() => {
            const debugLog = document.getElementById("debug-log");
            if (debugLog) debugLog.style.display = "none";
        }, 3000);
    }
}

// Bucle
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    // Actualizar la rotación de la cámara 3D en función del giroscopio del teléfono
    if (controls) controls.update();

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
