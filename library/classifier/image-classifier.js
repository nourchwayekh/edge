"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageClassifier = void 0;
const tsee_1 = require("tsee");
const sharp_1 = __importDefault(require("sharp"));
class ImageClassifier extends tsee_1.EventEmitter {
    /**
     * Classifies realtime image data from a camera
     * @param runner An initialized impulse runner instance
     * @param camera An initialized ICamera instance
     */
    constructor(runner, camera) {
        super();
        this._stopped = true;
        this._runningInference = false;
        this._runner = runner;
        this._camera = camera;
    }
    /**
     * Start the image classifier
     */
    async start() {
        let model = this._runner.getModel();
        if (model.modelParameters.sensorType !== 'camera') {
            throw new Error('Sensor for this model was not camera, but ' +
                model.modelParameters.sensor);
        }
        this._stopped = false;
        let frameQueue = [];
        this._camera.on('snapshot', async (data) => {
            // are we looking at video? Then we always add to the frameQueue
            if (model.modelParameters.image_input_frames > 1) {
                let resized = await this.resizeImage(model, data);
                frameQueue.push(resized);
            }
            // still running inferencing?
            if (this._runningInference) {
                return;
            }
            // too little frames? then wait for next one
            if (model.modelParameters.image_input_frames > 1 &&
                frameQueue.length < model.modelParameters.image_input_frames) {
                return;
            }
            this._runningInference = true;
            try {
                // if we have single frame then resize now
                if (model.modelParameters.image_input_frames > 1) {
                    frameQueue = frameQueue.slice(frameQueue.length - model.modelParameters.image_input_frames);
                }
                else {
                    let resized = await this.resizeImage(model, data);
                    frameQueue = [resized];
                }
                let img = frameQueue[frameQueue.length - 1].img;
                // slice the frame queue
                frameQueue = frameQueue.slice(frameQueue.length - model.modelParameters.image_input_frames);
                // concat the frames
                let values = [];
                for (let ix = 0; ix < model.modelParameters.image_input_frames; ix++) {
                    values = values.concat(frameQueue[ix].features);
                }
                let now = Date.now();
                if (this._stopped) {
                    return;
                }
                let classifyRes = await this._runner.classify(values);
                let timeSpent = Date.now() - now;
                let timingMs = classifyRes.timing.dsp + classifyRes.timing.classification + classifyRes.timing.anomaly;
                if (timingMs === 0) {
                    timingMs = 1;
                }
                this.emit('result', classifyRes, timingMs, await img.jpeg({ quality: 90 }).toBuffer());
            }
            finally {
                this._runningInference = false;
            }
        });
    }
    /**
     * Stop the classifier
     */
    async stop() {
        this._stopped = true;
        await Promise.all([
            this._camera ? this._camera.stop() : Promise.resolve(),
            this._runner.stop()
        ]);
    }
    async resizeImage(model, data) {
        // resize image and add to frameQueue
        let img;
        let features = [];
        if (model.modelParameters.image_channel_count === 3) {
            img = sharp_1.default(data).resize({
                height: model.modelParameters.image_input_height,
                width: model.modelParameters.image_input_width,
            });
            let buffer = await img.raw().toBuffer();
            for (let ix = 0; ix < buffer.length; ix += 3) {
                let r = buffer[ix + 0];
                let g = buffer[ix + 1];
                let b = buffer[ix + 2];
                // tslint:disable-next-line: no-bitwise
                features.push((r << 16) + (g << 8) + b);
            }
        }
        else {
            img = sharp_1.default(data).resize({
                height: model.modelParameters.image_input_height,
                width: model.modelParameters.image_input_width
            }).toColourspace('b-w');
            let buffer = await img.raw().toBuffer();
            for (let p of buffer) {
                // tslint:disable-next-line: no-bitwise
                features.push((p << 16) + (p << 8) + p);
            }
        }
        return {
            img: img,
            features: features
        };
    }
}
exports.ImageClassifier = ImageClassifier;
//# sourceMappingURL=image-classifier.js.map