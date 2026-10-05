// Lightship WebAR SDK - Local Module Version

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
        this._hitTestSource = null;
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

        if (this.features.includes("hit-test")) {
            await this._initHitTest();
        }

        this.session.requestAnimationFrame(this._onXRFrame.bind(this));

        console.log("Lightship local module cargado correctamente.");
    }

    async _initHitTest() {
        const viewerSpace = await this.session.requestReferenceSpace("viewer");
        this._hitTestSource = await this.session.requestHitTestSource({
            space: viewerSpace
        });
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
        if (!this._hitTestSource) return null;

        const results = frame.getHitTestResults(this._hitTestSource);
        if (results.length > 0) {
            return results[0].getPose(this.xrRefSpace);
        }

        return null;
    }

    start() {
        this.session.requestAnimationFrame(this._onXRFrame.bind(this));
    }

    stop() {
        if (this.session) {
            this.session.end();
        }
    }
}
