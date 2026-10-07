import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARButton } from "three/addons/webxr/ARButton.js";

let container;
let camera, scene, renderer;
let controller;

let reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;

let model = null;
let mixer = null;
let hasSpawned = false;

const clock = new THREE.Clock();
const overlay = document.getElementById("overlay");

// Elementos para el escaneo de QR vía video
let videoElement = document.createElement("video");
let canvasElement = document.createElement("canvas");
let canvasCtx = canvasElement.getContext("2d");

init();

function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(0, 6, 0);
    scene.add(directionalLight);

    // Renderer con soporte WebXR
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Botón para iniciar la experiencia WebXR
    document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] }));

    // Cargar modelo 3D GLTF
    const loader = new GLTFLoader();
    loader.load(
        "./model.glb",
        (gltf) => {
            model = gltf.scene;
            model.scale.set(0.2, 0.2, 0.2);

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play();
                });
            }
        },
        undefined,
        (err) => console.error("Error al cargar model.glb:", err)
    );

    // Retículo visual para indicar la superficie detectada
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    window.addEventListener("resize", onWindowResize);

    // Loop de render de WebXR
    renderer.setAnimationLoop(render);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Escáner de QR utilizando las texturas de la cámara
function scanQRCode() {
    if (hasSpawned || !model) return null;

    // Extraer dimensiones del viewport
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvasElement.width !== width) {
        canvasElement.width = width;
        canvasElement.height = height;
    }

    // Dibujar el fotograma actual de WebGL en el canvas
    canvasCtx.drawImage(renderer.domElement, 0, 0, width, height);
    const imageData = canvasCtx.getImageData(0, 0, width, height);

    // Decodificar con jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code;
}

function render(timestamp, frame) {
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        // Solicitar Hit-Test Source para el seguimiento de la superficie física
        if (!hitTestSourceRequested) {
            session.requestReferenceSpace("viewer").then((viewerSpace) => {
                session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                    hitTestSource = source;
                });
            });

            session.addEventListener("end", () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });

            hitTestSourceRequested = true;
        }

        // Evaluar las colisiones con el suelo en tiempo real
        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                reticle.visible = !hasSpawned;
                reticle.matrix.fromArray(pose.transform.matrix);

                // Escanear QR en busca de la activación
                const qrCode = scanQRCode();

                if (qrCode && !hasSpawned) {
                    // "Hacer nacer" al perrete en las coordenadas físicas del retículo/suelo
                    model.position.setFromMatrixPosition(reticle.matrix);
                    model.quaternion.setFromRotationMatrix(reticle.matrix);

                    scene.add(model);
                    hasSpawned = true;
                    reticle.visible = false;

                    overlay.innerText = "¡El perrete ha nacido! Puedes moverte libremente.";
                    setTimeout(() => { overlay.style.display = "none"; }, 4000);
                }
            } else {
                reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}
