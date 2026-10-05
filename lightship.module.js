// Lightship WebAR SDK - Local Module Version
// (Bloque 1/4)

export class Lightship {
    static async create(options = {}) {
        const instance = new Lightship(options);
        await instance._init();
        return instance;
    }

    constructor(options) {
        this.canvas = options.canvas;
        this.features = options.features || [];
        this.session = null;
        this.gl = null;
        this.xrRefSpace = null;
        this._frameCallback = null;
    }

    async _init() {
        if (!navigator.xr) {
            throw new Error("WebXR no soportado en este navegador.");
        }

        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        if (!supported) {
            throw new Error("AR no soportado en este dispositivo.");
        }

        this.session = await navigator.xr.requestSession("immersive-ar", {
            requiredFeatures: this.features,
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body }
        });

        this.gl = this.canvas.getContext("webgl", { xrCompatible: true });
        await this.session.updateRenderState({
            baseLayer: new XRWebGLLayer(this.session, this.gl)
        });

        this.xrRefSpace = await this.session.requestReferenceSpace("local");

        this.session.requestAnimationFrame(this._onXRFrame.bind(this));
    }

    _onXRFrame(t, frame) {
        const session = frame.session;
        session.requestAnimationFrame(this._onXRFrame.bind(this));

        const pose = frame.getViewerPose(this.xrRefSpace);
        if (!pose) return;

        if (this._frameCallback) {
            this._frameCallback(t, frame, pose);
        }
    }

    onFrame(callback) {
        this._frameCallback = callback;
    }

    getHitTestPose(frame) {
        try {
            const results = frame.getHitTestResults(this._hitTestSource);
            if (results.length > 0) {
                return results[0].getPose(this.xrRefSpace);
            }
        } catch (e) {}
        return null;
    }

    async enableHitTest() {
        const viewerSpace = await this.session.requestReferenceSpace("viewer");
        this._hitTestSource = await this.session.requestHitTestSource({
            space: viewerSpace
        });
    }
}
// Lightship WebAR SDK - Local Module Version
// (Bloque 2/4)

Lightship.prototype._initHitTest = async function () {
    if (!this.features.includes("hit-test")) return;

    const viewerSpace = await this.session.requestReferenceSpace("viewer");
    this._hitTestSource = await this.session.requestHitTestSource({
        space: viewerSpace
    });
};

Lightship.prototype._initMeshing = async function () {
    if (!this.features.includes("meshing")) return;

    try {
        await this.session.requestMeshDetection();
    } catch (e) {
        console.warn("Meshing no soportado:", e);
    }
};
// Lightship WebAR SDK - Local Module Version
// (Bloque 3/4)

Lightship.prototype._onXRFrame = function (t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(this._onXRFrame.bind(this));

    const pose = frame.getViewerPose(this.xrRefSpace);
    if (!pose) return;

    if (this._frameCallback) {
        this._frameCallback(t, frame, pose);
    }
};

Lightship.prototype.start = function () {
    this.session.requestAnimationFrame(this._onXRFrame.bind(this));
};
// Lightship WebAR SDK - Local Module Version
// (Bloque 4/4)

Lightship.prototype.stop = function () {
    if (this.session) {
        this.session.end();
    }
};

console.log("Lightship local module cargado correctamente.");

