#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const imagesnap_1 = require("../../library/sensors/imagesnap");
const inquirer_1 = __importDefault(require("inquirer"));
const init_cli_app_1 = require("../init-cli-app");
const remote_mgmt_service_1 = require("../../shared/daemon/remote-mgmt-service");
const make_image_1 = require("../make-image");
const tsee_1 = require("tsee");
const async_mutex_1 = require("async-mutex");
const sharp_1 = __importDefault(require("sharp"));
const recorder_1 = require("../../library/sensors/recorder");
const gstreamer_1 = require("../../library/sensors/gstreamer");
const get_ips_1 = require("../../library/get-ips");
const commander_1 = __importDefault(require("commander"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ws_1 = __importDefault(require("ws"));
const prophesee_1 = require("../../library/sensors/prophesee");
const video_recorder_1 = require("../../library/sensors/video-recorder");
const packageVersion = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8')).version;
commander_1.default
    .description('Edge Impulse Linux client ' + packageVersion)
    .version(packageVersion)
    .option('--api-key <key>', 'API key to authenticate with Edge Impulse (overrides current credentials)')
    .option('--hmac-key <key>', 'HMAC key to sign new data with (overrides current credentials)')
    .option('--disable-camera', `Don't prompt for camera`)
    .option('--disable-microphone', `Don't prompt for microphone`)
    .option('--width <px>', 'Desired width of the camera stream')
    .option('--height <px>', 'Desired height of the camera stream')
    .option('--clean', 'Clear credentials')
    .option('--silent', `Run in silent mode, don't prompt for credentials`)
    .option('--dev', 'List development servers, alternatively you can use the EI_HOST environmental variable ' +
    'to specify the Edge Impulse instance.')
    .option('--verbose', 'Enable debug logs')
    .allowUnknownOption(true)
    .parse(process.argv);
const devArgv = !!commander_1.default.dev;
const cleanArgv = !!commander_1.default.clean;
const silentArgv = !!commander_1.default.silent;
const verboseArgv = !!commander_1.default.verbose;
const apiKeyArgv = commander_1.default.apiKey;
const hmacKeyArgv = commander_1.default.hmacKey;
const noCamera = !!commander_1.default.disableCamera;
const noMicrophone = !!commander_1.default.disableMicrophone;
const isProphesee = process.env.PROPHESEE_CAM === '1';
const enableVideo = isProphesee || (process.env.ENABLE_VIDEO === '1');
const dimensions = commander_1.default.width && commander_1.default.height ? {
    width: Number(commander_1.default.width),
    height: Number(commander_1.default.height)
} : undefined;
if ((commander_1.default.width && !commander_1.default.height) || (!commander_1.default.width && commander_1.default.height)) {
    console.error('--width and --height need to either be both specified or both omitted');
    process.exit(1);
}
const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';
const cliOptions = {
    appName: 'Edge Impulse Linux client',
    apiKeyArgv: apiKeyArgv,
    cleanArgv: cleanArgv,
    devArgv: devArgv,
    hmacKeyArgv: hmacKeyArgv,
    silentArgv: silentArgv,
    connectProjectMsg: 'To which project do you want to connect this device?',
    getProjectFromConfig: async () => {
        let projectId = await configFactory.getLinuxProjectId();
        if (!projectId) {
            return undefined;
        }
        return { projectId: projectId };
    }
};
class LinuxDevice extends tsee_1.EventEmitter {
    constructor(cameraInstance, config, devKeys) {
        super();
        this._snapshotStreaming = false;
        this._lastSnapshot = new Date(0);
        this._snapshotMutex = new async_mutex_1.Mutex();
        this._snapshotId = 0;
        this._snapshotStreamingResolution = 'low';
        this._camera = cameraInstance;
        this._config = config;
        this._devKeys = devKeys;
        if (this._camera) {
            this._camera.on('snapshot', async (buffer, filename) => {
                const id = ++this._snapshotId;
                const release = await this._snapshotMutex.acquire();
                let timeBetweenFrames = this._snapshotStreamingResolution === 'low' ?
                    100 : 0;
                // limit to 10 frames a second & no new frames should have come in...
                try {
                    if (this._snapshotStreaming &&
                        Date.now() - +this._lastSnapshot >= timeBetweenFrames &&
                        id === this._snapshotId) {
                        if (this._snapshotStreamingResolution === 'low') {
                            const jpg = sharp_1.default(buffer);
                            const resized = await jpg.resize(undefined, 96).jpeg().toBuffer();
                            this.emit('snapshot', resized, filename);
                        }
                        else {
                            this.emit('snapshot', buffer, filename);
                        }
                        this._lastSnapshot = new Date();
                    }
                }
                catch (ex) {
                    console.warn('Failed to handle snapshot', ex);
                }
                finally {
                    release();
                }
            });
        }
    }
    connected() {
        return true;
    }
    async getDeviceId() {
        return get_ips_1.ips.length > 0 ? get_ips_1.ips[0].mac : '00:00:00:00:00:00';
    }
    getDeviceType() {
        let id = (get_ips_1.ips.length > 0 ? get_ips_1.ips[0].mac : '00:00:00:00:00:00').toLowerCase();
        if (id.startsWith('dc:a6:32') || id.startsWith('b8:27:eb')) {
            return 'RASPBERRY_PI';
        }
        if (id.startsWith('00:04:4b') || id.startsWith('48:b0:2d')) {
            return 'NVIDIA_JETSON_NANO';
        }
        return 'EDGE_IMPULSE_LINUX';
    }
    getSensors() {
        let sensors = [];
        if (!noMicrophone) {
            sensors.push({
                name: 'Microphone',
                frequencies: [16000],
                maxSampleLengthS: 3600
            });
        }
        if (camera) {
            let str = dimensions ? `(${dimensions.width}x${dimensions.height})` : `640x480`;
            sensors.push({
                name: `Camera (${str})`,
                frequencies: [],
                maxSampleLengthS: 60000
            });
            if (enableVideo) {
                sensors.push({
                    name: 'Video (1280x720)',
                    frequencies: [],
                    maxSampleLengthS: 60000
                });
            }
        }
        return sensors;
    }
    supportsSnapshotStreaming() {
        return true;
    }
    supportsSnapshotStreamingWhileCapturing() {
        return true;
    }
    beforeConnect() {
        return Promise.resolve();
    }
    async startSnapshotStreaming(resolution) {
        this._snapshotStreaming = true;
        this._snapshotStreamingResolution = resolution;
    }
    async stopSnapshotStreaming() {
        this._snapshotStreaming = false;
    }
    async sampleRequest(data, ee) {
        var _a, _b;
        if ((_a = data.sensor) === null || _a === void 0 ? void 0 : _a.startsWith('Camera')) {
            if (!this._camera) {
                throw new Error('Linux daemon was started with --no-camera');
            }
            ee.emit('started');
            let jpg = await new Promise((resolve, reject) => {
                if (!this._camera) {
                    return reject('No camera');
                }
                setTimeout(() => {
                    reject('Timeout');
                }, 3000);
                this._camera.once('snapshot', buffer => {
                    resolve(buffer);
                });
            });
            console.log(SERIAL_PREFIX, 'Uploading sample to', this._config.endpoints.internal.ingestion + data.path + '...');
            ee.emit('uploading');
            await make_image_1.upload({
                apiKey: this._devKeys.apiKey,
                filename: data.label + '.jpg',
                buffer: jpg,
                allowDuplicates: false,
                category: data.path.indexOf('/training') > -1 ? 'training' : 'testing',
                config: this._config,
                label: { label: data.label, type: 'label' },
                boundingBoxes: undefined,
                metadata: {},
                addDateId: true,
            });
            console.log(SERIAL_PREFIX, 'Sampling finished');
        }
        else if ((_b = data.sensor) === null || _b === void 0 ? void 0 : _b.startsWith('Video')) {
            if (!this._camera) {
                throw new Error('Linux daemon was started with --no-camera');
            }
            console.log(SERIAL_PREFIX, 'Waiting 2 seconds');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            ee.emit('started');
            // give some time to emit...
            await await new Promise((resolve) => setTimeout(resolve, 10));
            let video = new video_recorder_1.VideoRecorder(this._camera, verboseArgv);
            let videoEe = await video.record(data.length);
            videoEe.on('processing', () => ee.emit('processing'));
            let mp4 = await new Promise((resolve, reject) => {
                if (!this._camera) {
                    return reject('No camera');
                }
                videoEe.on('error', err => {
                    reject(err);
                });
                videoEe.on('done', buffer => {
                    resolve(buffer);
                });
            });
            console.log(SERIAL_PREFIX, 'Uploading sample to', this._config.endpoints.internal.ingestion + data.path + '...');
            ee.emit('uploading');
            await make_image_1.upload({
                apiKey: this._devKeys.apiKey,
                filename: data.label + '.mp4',
                buffer: mp4,
                allowDuplicates: false,
                category: data.path.indexOf('/training') > -1 ? 'training' : 'testing',
                config: this._config,
                label: { label: data.label, type: 'label' },
                boundingBoxes: undefined,
                metadata: {},
                addDateId: true,
            });
            console.log(SERIAL_PREFIX, 'Sampling finished');
        }
        else if (data.sensor === 'Microphone') {
            if (noMicrophone) {
                throw new Error('Linux daemon was started with --no-microphone');
            }
            let now = Date.now();
            const recorder = new recorder_1.AudioRecorder({
                sampleRate: Math.round(1000 / data.interval),
                channels: 1,
                asRaw: true,
                verbose: verboseArgv,
            });
            console.log(SERIAL_PREFIX, 'Waiting 2 seconds');
            const audio = await recorder.start(await configFactory.getAudio() || '');
            // sleep 2 seconds before starting...
            await new Promise((resolve) => {
                let time = 2000 - (Date.now() - now);
                if (time > 0) {
                    setTimeout(resolve, time);
                }
                else {
                    resolve();
                }
            });
            console.log(SERIAL_PREFIX, 'Recording audio...');
            ee.emit('started');
            const audioBuffer = await new Promise((resolve) => {
                let audioBuffers = [];
                let totalAudioLength = 0;
                let bytesNeeded = (Math.round(1000 / data.interval) * (data.length / 1000)) * 2;
                const onData = (b) => {
                    audioBuffers.push(b);
                    totalAudioLength += b.length;
                    if (totalAudioLength > bytesNeeded) {
                        resolve(Buffer.concat(audioBuffers).slice(0, bytesNeeded));
                        audio.ee.off('data', onData);
                    }
                };
                audio.ee.on('data', onData);
            });
            await audio.stop();
            ee.emit('processing');
            let wavFile = this.buildWavFileBuffer(audioBuffer, data.interval);
            console.log(SERIAL_PREFIX, 'Uploading sample to', this._config.endpoints.internal.ingestion + data.path + '...');
            ee.emit('uploading');
            await make_image_1.upload({
                apiKey: this._devKeys.apiKey,
                filename: data.label + '.wav',
                buffer: wavFile,
                allowDuplicates: false,
                category: data.path.indexOf('/training') > -1 ? 'training' : 'testing',
                config: this._config,
                label: { label: data.label, type: 'label' },
                boundingBoxes: undefined,
                metadata: {},
                addDateId: true,
            });
            console.log(SERIAL_PREFIX, 'Sampling finished');
        }
        else {
            throw new Error('Invalid sensor: ' + data.sensor);
        }
    }
    buildWavFileBuffer(data, intervalMs) {
        // let's build a WAV file!
        let wavFreq = 1 / intervalMs * 1000;
        let fileSize = 44 + (data.length);
        let dataSize = (data.length);
        let srBpsC8 = (wavFreq * 16 * 1) / 8;
        let headerArr = new Uint8Array(44);
        let h = [
            0x52, 0x49, 0x46, 0x46,
            // tslint:disable-next-line: no-bitwise
            fileSize & 0xff, (fileSize >> 8) & 0xff, (fileSize >> 16) & 0xff, (fileSize >> 24) & 0xff,
            0x57, 0x41, 0x56, 0x45,
            0x66, 0x6d, 0x74, 0x20,
            0x10, 0x00, 0x00, 0x00,
            0x01, 0x00,
            0x01, 0x00,
            // tslint:disable-next-line: no-bitwise
            wavFreq & 0xff, (wavFreq >> 8) & 0xff, (wavFreq >> 16) & 0xff, (wavFreq >> 24) & 0xff,
            // tslint:disable-next-line: no-bitwise
            srBpsC8 & 0xff, (srBpsC8 >> 8) & 0xff, (srBpsC8 >> 16) & 0xff, (srBpsC8 >> 24) & 0xff,
            0x02, 0x00, 0x10, 0x00,
            0x64, 0x61, 0x74, 0x61,
            // tslint:disable-next-line: no-bitwise
            dataSize & 0xff, (dataSize >> 8) & 0xff, (dataSize >> 16) & 0xff, (dataSize >> 24) & 0xff,
        ];
        for (let hx = 0; hx < 44; hx++) {
            headerArr[hx] = h[hx];
        }
        return Buffer.concat([Buffer.from(headerArr), data]);
    }
}
let camera;
let configFactory;
let isExiting = false;
// tslint:disable-next-line: no-floating-promises
(async () => {
    try {
        const init = await init_cli_app_1.initCliApp(cliOptions);
        const config = init.config;
        configFactory = init.configFactory;
        const { projectId, devKeys } = await init_cli_app_1.setupCliApp(configFactory, config, cliOptions, undefined);
        await configFactory.setLinuxProjectId(projectId);
        if (!noCamera) {
            if (isProphesee) {
                camera = new prophesee_1.Prophesee(verboseArgv);
            }
            else if (process.platform === 'darwin') {
                camera = new imagesnap_1.Imagesnap(verboseArgv);
            }
            else if (process.platform === 'linux') {
                camera = new gstreamer_1.GStreamer(verboseArgv);
            }
            else {
                throw new Error('Unsupported platform: "' + process.platform + '"');
            }
            await camera.init();
        }
        const linuxDevice = new LinuxDevice(camera, config, devKeys);
        const remoteMgmt = new remote_mgmt_service_1.RemoteMgmt(projectId, devKeys, Object.assign({
            command: 'edge-impulse-linux',
        }, config), linuxDevice, url => new ws_1.default(url), async (currName) => {
            let nameDevice = await inquirer_1.default.prompt([{
                    type: 'input',
                    message: 'What name do you want to give this device?',
                    name: 'nameDevice',
                    default: currName
                }]);
            return nameDevice.nameDevice;
        });
        let firstExit = true;
        const onSignal = async () => {
            if (!firstExit) {
                process.exit(1);
            }
            else {
                isExiting = true;
                console.log(SERIAL_PREFIX, 'Received stop signal, stopping application... ' +
                    'Press CTRL+C again to force quit.');
                firstExit = false;
                try {
                    if (camera) {
                        await camera.stop();
                    }
                    process.exit(0);
                }
                catch (ex2) {
                    let ex = ex2;
                    console.log(SERIAL_PREFIX, 'Failed to stop inferencing', ex.message);
                }
                process.exit(1);
            }
        };
        process.on('SIGHUP', onSignal);
        process.on('SIGINT', onSignal);
        if (!noMicrophone) {
            let audioDevice;
            const audioDevices = await recorder_1.AudioRecorder.ListDevices();
            const storedAudio = await configFactory.getAudio();
            if (storedAudio && audioDevices.find(d => d.id === storedAudio)) {
                audioDevice = storedAudio;
            }
            else if (audioDevices.length === 1) {
                audioDevice = audioDevices[0].id;
            }
            else if (audioDevices.length === 0) {
                console.warn(SERIAL_PREFIX, 'Could not find any microphones, ' +
                    'run this command with --disable-microphone to skip selection');
                audioDevice = '';
            }
            else {
                let inqRes = await inquirer_1.default.prompt([{
                        type: 'list',
                        choices: (audioDevices || []).map(p => ({ name: p.name, value: p.id })),
                        name: 'microphone',
                        message: 'Select a microphone (or run this command with --disable-microphone to skip selection)',
                        pageSize: 20
                    }]);
                audioDevice = inqRes.microphone;
            }
            await configFactory.storeAudio(audioDevice);
            console.log(SERIAL_PREFIX, 'Using microphone', audioDevice);
        }
        if (camera) {
            let cameraDevice;
            const cameraDevices = await camera.listDevices();
            if (cameraDevices.length === 0) {
                throw new Error('Cannot find any webcams, run this command with --disable-camera to skip selection');
            }
            const storedCamera = await configFactory.getCamera();
            if (storedCamera && cameraDevices.find(d => d === storedCamera)) {
                cameraDevice = storedCamera;
            }
            else if (cameraDevices.length === 1) {
                cameraDevice = cameraDevices[0];
            }
            else {
                let inqRes = await inquirer_1.default.prompt([{
                        type: 'list',
                        choices: (cameraDevices || []).map(p => ({ name: p, value: p })),
                        name: 'camera',
                        message: 'Select a camera (or run this command with --disable-camera to skip selection)',
                        pageSize: 20
                    }]);
                cameraDevice = inqRes.camera;
            }
            await configFactory.storeCamera(cameraDevice);
            console.log(SERIAL_PREFIX, 'Using camera', cameraDevice, 'starting...');
            if (isProphesee) {
                await camera.start({
                    device: cameraDevice,
                    intervalMs: 40,
                    dimensions: dimensions
                });
            }
            else {
                await camera.start({
                    device: cameraDevice,
                    intervalMs: 200,
                    dimensions: dimensions
                });
            }
            camera.on('error', error => {
                if (isExiting)
                    return;
                console.log('camera error', error);
                process.exit(1);
            });
            console.log(SERIAL_PREFIX, 'Connected to camera');
        }
        remoteMgmt.on('authenticationFailed', async () => {
            console.log(SERIAL_PREFIX, 'Authentication failed');
            if (camera) {
                await camera.stop();
            }
            process.exit(1);
        });
        await remoteMgmt.connect();
    }
    catch (ex) {
        console.error('Failed to initialize linux tool', ex);
        if (camera) {
            await camera.stop();
        }
        process.exit(1);
    }
})();
//# sourceMappingURL=linux.js.map