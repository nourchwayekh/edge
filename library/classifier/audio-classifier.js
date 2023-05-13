"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioClassifier = void 0;
const tsee_1 = require("tsee");
const recorder_1 = require("../sensors/recorder");
class AudioClassifier extends tsee_1.EventEmitter {
    /**
     * Classifies realtime audio data
     * @param runner An instance of the initialized impulse runner
     * @param verbose Whether to log debug info
     */
    constructor(runner, verbose = false) {
        super();
        this._stopped = true;
        this._runner = runner;
        this._verbose = verbose;
    }
    /**
     * Start the audio classifier
     * @param sliceLengthMs Slice length in milliseconds (runs inference every X ms.)
     *                      this is ignored if the model has a fixed slice_size
     *                      (true for all new models)
     */
    async start(device, sliceLengthMs = 250) {
        let model = this._runner.getModel();
        if (model.modelParameters.sensorType !== 'microphone') {
            throw new Error('Sensor for this model was not microphone, but ' +
                model.modelParameters.sensorType);
        }
        this._stopped = false;
        this._recorder = new recorder_1.AudioRecorder({
            sampleRate: model.modelParameters.frequency,
            channels: 1,
            asRaw: true,
            verbose: this._verbose
        });
        this._audio = await this._recorder.start(device);
        let fullFrameBuffer = Buffer.from([]);
        const fullFrameBytes = model.modelParameters.input_features_count * 2;
        let sliceBytes;
        if (model.modelParameters.slice_size) {
            sliceBytes = model.modelParameters.slice_size * 2;
        }
        else {
            sliceBytes = (sliceLengthMs / 1000) * model.modelParameters.frequency * 2;
        }
        let firstFrame = true;
        const onData = async (data) => {
            fullFrameBuffer = Buffer.concat([fullFrameBuffer, data]);
            if (fullFrameBuffer.length >= fullFrameBytes) {
                // one sec slice
                let buffer = fullFrameBuffer.slice(fullFrameBuffer.length - fullFrameBytes);
                let values = [];
                for (let ix = 0; ix < buffer.length; ix += 2) {
                    values.push(buffer.readInt16LE(ix));
                }
                if (firstFrame) {
                    let diff = Math.max(...new Set(values)) - Math.min(...new Set(values));
                    if (diff < 20) {
                        this.emit('noAudioError');
                        if (this._audio) {
                            this._audio.ee.off('data', onData);
                        }
                    }
                    firstFrame = false;
                }
                // console.log('data in', values);
                // retain the last X ms (without the slice).
                fullFrameBuffer = fullFrameBuffer.slice((fullFrameBuffer.length - (fullFrameBytes - sliceBytes)));
                let now = Date.now();
                if (this._stopped)
                    return;
                let classifyRes;
                if (model.modelParameters.use_continuous_mode && model.modelParameters.slice_size) {
                    classifyRes = await this._runner.classifyContinuous(values.slice(values.length - model.modelParameters.slice_size));
                }
                else {
                    classifyRes = await this._runner.classify(values);
                }
                let timeSpent = Date.now() - now;
                let timingMs = classifyRes.timing.dsp + classifyRes.timing.classification + classifyRes.timing.anomaly;
                if (timingMs === 0) {
                    timingMs = 1;
                }
                this.emit('result', classifyRes, timingMs, buffer);
            }
        };
        this._audio.ee.on('data', onData);
    }
    /**
     * Stop the audio classifier
     */
    async stop() {
        this._stopped = true;
        await Promise.all([
            this._audio ? this._audio.stop() : Promise.resolve(),
            this._runner.stop()
        ]);
    }
}
exports.AudioClassifier = AudioClassifier;
//# sourceMappingURL=audio-classifier.js.map