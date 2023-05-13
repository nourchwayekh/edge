#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const linux_impulse_runner_1 = require("../../library/classifier/linux-impulse-runner");
const audio_classifier_1 = require("../../library/classifier/audio-classifier");
const image_classifier_1 = require("../../library/classifier/image-classifier");
const imagesnap_1 = require("../../library/sensors/imagesnap");
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("../config");
const init_cli_app_1 = require("../init-cli-app");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const runner_downloader_1 = require("./runner-downloader");
const gstreamer_1 = require("../../library/sensors/gstreamer");
const commander_1 = __importDefault(require("commander"));
const express = require("express");
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const sharp_1 = __importDefault(require("sharp"));
const library_1 = require("../../library");
const get_ips_1 = require("../get-ips");
const prophesee_1 = require("../../library/sensors/prophesee");
const RUNNER_PREFIX = '\x1b[33m[RUN]\x1b[0m';
const BUILD_PREFIX = '\x1b[32m[BLD]\x1b[0m';
let audioClassifier;
let imageClassifier;
let configFactory;
const packageVersion = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8')).version;
commander_1.default
    .description('Edge Impulse Linux runner ' + packageVersion)
    .version(packageVersion)
    .option('--model-file <file>', 'Specify model file (either path to .eim, or the socket on which the model is running), ' +
    'if not provided the model will be fetched from Edge Impulse')
    .option('--api-key <key>', 'API key to authenticate with Edge Impulse (overrides current credentials)')
    .option('--download <file>', 'Just download the model and store it on the file system')
    .option('--list-targets', 'List all supported targets and inference engines')
    .option('--force-target <target>', 'Do not autodetect the target system, but set it by hand (e.g. "runner-linux-aarch64")')
    .option('--force-engine <engine>', 'Do not autodetect the inference engine, but set it by hand (e.g. "tflite")')
    .option('--clean', 'Clear credentials')
    .option('--silent', `Run in silent mode, don't prompt for credentials`)
    .option('--quantized', 'Download int8 quantized neural networks, rather than the float32 neural networks. ' +
    'These might run faster on some architectures, but have reduced accuracy.')
    .option('--enable-camera', 'Always enable the camera. This flag needs to be used to get data from the microphone ' +
    'on some USB webcams.')
    .option('--dev', 'List development servers, alternatively you can use the EI_HOST environmental variable ' +
    'to specify the Edge Impulse instance.')
    .option('--verbose', 'Enable debug logs')
    .allowUnknownOption(true)
    .parse(process.argv);
const devArgv = !!commander_1.default.dev;
const cleanArgv = !!commander_1.default.clean;
const silentArgv = !!commander_1.default.silent;
const quantizedArgv = !!commander_1.default.quantized;
const enableCameraArgv = !!commander_1.default.enableCamera;
const verboseArgv = !!commander_1.default.verbose;
const apiKeyArgv = commander_1.default.apiKey;
const modelFileArgv = commander_1.default.modelFile;
const downloadArgv = commander_1.default.download;
const forceTargetArgv = commander_1.default.forceTarget;
const forceEngineArgv = commander_1.default.forceEngine;
const listTargetsArgv = !!commander_1.default.listTargets;
process.on('warning', e => console.warn(e.stack));
const cliOptions = {
    appName: 'Edge Impulse Linux runner',
    apiKeyArgv: apiKeyArgv,
    cleanArgv: cleanArgv,
    devArgv: devArgv,
    hmacKeyArgv: undefined,
    silentArgv: silentArgv,
    connectProjectMsg: 'From which project do you want to load the model?',
    getProjectFromConfig: async () => {
        if (!configFactory)
            return undefined;
        let projectId = await configFactory.getLinuxProjectId();
        if (!projectId) {
            return undefined;
        }
        return { projectId: projectId };
    }
};
let firstExit = true;
let isExiting = false;
const onSignal = async () => {
    if (!firstExit) {
        process.exit(1);
    }
    else {
        isExiting = true;
        console.log(RUNNER_PREFIX, 'Received stop signal, stopping application... ' +
            'Press CTRL+C again to force quit.');
        firstExit = false;
        try {
            if (audioClassifier) {
                await audioClassifier.stop();
            }
            if (imageClassifier) {
                await imageClassifier.stop();
            }
            process.exit(0);
        }
        catch (ex2) {
            let ex = ex2;
            console.log(RUNNER_PREFIX, 'Failed to stop inferencing', ex.message);
        }
        process.exit(1);
    }
};
process.on('SIGHUP', onSignal);
process.on('SIGINT', onSignal);
// tslint:disable-next-line: no-floating-promises
(async () => {
    try {
        let modelFile;
        if (listTargetsArgv && modelFile) {
            throw new Error('Cannot combine --list-targets and --model-file');
        }
        let modelPath;
        // no model file passed in? then build / download the latest deployment...
        if (!modelFileArgv) {
            const init = await init_cli_app_1.initCliApp(cliOptions);
            const config = init.config;
            configFactory = init.configFactory;
            const { projectId, devKeys } = await init_cli_app_1.setupCliApp(configFactory, config, cliOptions, undefined);
            await configFactory.setLinuxProjectId(projectId);
            if (listTargetsArgv) {
                const targets = await config.api.deployment.listDeploymentTargetsForProjectDataSources(projectId);
                console.log('Listing all available targets');
                console.log('-----------------------------');
                for (let t of targets.targets.filter(x => x.format.startsWith('runner'))) {
                    console.log(`target: ${t.format}, name: ${t.name}, supported engines: [${t.supportedEngines.join(', ')}]`);
                }
                console.log('');
                console.log('You can force a target via "edge-impulse-linux-runner --force-target <target> [--force-engine <engine>]"');
                process.exit(0);
            }
            const downloader = new runner_downloader_1.RunnerDownloader(projectId, quantizedArgv ? 'int8' : 'float32', config, forceTargetArgv, forceEngineArgv);
            downloader.on('build-progress', msg => {
                console.log(BUILD_PREFIX, msg);
            });
            modelPath = new runner_downloader_1.RunnerModelPath(projectId, quantizedArgv ? 'int8' : 'float32', forceTargetArgv, forceEngineArgv);
            // no new version? and already downloaded? return that model
            let currVersion = await downloader.getLastDeploymentVersion();
            if (currVersion && await checkFileExists(modelPath.getModelPath(currVersion))) {
                modelFile = modelPath.getModelPath(currVersion);
                console.log(RUNNER_PREFIX, 'Already have model', modelFile, 'not downloading...');
            }
            else {
                console.log(RUNNER_PREFIX, 'Downloading model...');
                let deployment = await downloader.downloadDeployment();
                let tmpDir = await fs_1.default.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'ei-' + Date.now()));
                tmpDir = path_1.default.join(os_1.default.tmpdir(), tmpDir);
                await fs_1.default.promises.mkdir(tmpDir, { recursive: true });
                let ret = await downloader.getDownloadType();
                modelFile = path_1.default.join(tmpDir, ret[0]);
                await fs_1.default.promises.writeFile(modelFile, deployment);
                await fs_1.default.promises.chmod(modelFile, 0o755);
                console.log(RUNNER_PREFIX, 'Downloading model OK');
            }
            if (downloadArgv) {
                await fs_1.default.promises.mkdir(path_1.default.dirname(downloadArgv), { recursive: true });
                await fs_1.default.promises.copyFile(modelFile, downloadArgv);
                console.log(RUNNER_PREFIX, 'Stored model in', path_1.default.resolve(downloadArgv));
                return process.exit(0);
            }
        }
        else {
            if (downloadArgv) {
                throw new Error('Cannot combine --model-file and --download');
            }
            configFactory = new config_1.Config();
            modelFile = modelFileArgv;
            await fs_1.default.promises.chmod(modelFile, 0o755);
        }
        const runner = new linux_impulse_runner_1.LinuxImpulseRunner(modelFile);
        const model = await runner.init();
        // if downloaded? then store...
        if (!modelFileArgv && modelPath) {
            let file = modelPath.getModelPath(model.project.deploy_version);
            if (file !== modelFile) {
                await fs_1.default.promises.mkdir(path_1.default.dirname(file), { recursive: true });
                await fs_1.default.promises.copyFile(modelFile, file);
                await fs_1.default.promises.unlink(modelFile);
                console.log(RUNNER_PREFIX, 'Stored model version in', file);
            }
        }
        let param = model.modelParameters;
        if (param.sensorType === 'microphone') {
            console.log(RUNNER_PREFIX, 'Starting the audio classifier for', model.project.owner + ' / ' + model.project.name, '(v' + model.project.deploy_version + ')');
            console.log(RUNNER_PREFIX, 'Parameters', 'freq', param.frequency + 'Hz', 'window length', ((param.input_features_count / param.frequency) * 1000) + 'ms.', 'classes', param.labels);
            if (enableCameraArgv) {
                await connectCamera(configFactory);
            }
            let audioDevice;
            const audioDevices = await library_1.AudioRecorder.ListDevices();
            const storedAudio = await configFactory.getAudio();
            if (storedAudio && audioDevices.find(d => d.id === storedAudio)) {
                audioDevice = storedAudio;
            }
            else if (audioDevices.length === 1) {
                audioDevice = audioDevices[0].id;
            }
            else if (audioDevices.length === 0) {
                console.warn(RUNNER_PREFIX, 'Could not find any microphones...');
                audioDevice = '';
            }
            else {
                let inqRes = await inquirer_1.default.prompt([{
                        type: 'list',
                        choices: (audioDevices || []).map(p => ({ name: p.name, value: p.id })),
                        name: 'microphone',
                        message: 'Select a microphone',
                        pageSize: 20
                    }]);
                audioDevice = inqRes.microphone;
            }
            await configFactory.storeAudio(audioDevice);
            console.log(RUNNER_PREFIX, 'Using microphone ' + audioDevice);
            audioClassifier = new audio_classifier_1.AudioClassifier(runner, verboseArgv);
            audioClassifier.on('noAudioError', async () => {
                console.log('');
                console.log(RUNNER_PREFIX, 'ERR: Did not receive any audio.');
                console.log('ERR: Did not receive any audio. Here are some potential causes:');
                console.log('* If you are on macOS this might be a permissions issue.');
                console.log('  Are you running this command from a simulated shell (like in Visual Studio Code)?');
                console.log('* If you are on Linux and use a microphone in a webcam, you might also want');
                console.log('  to initialize the camera with --enable-camera');
                await (audioClassifier === null || audioClassifier === void 0 ? void 0 : audioClassifier.stop());
                process.exit(1);
            });
            await audioClassifier.start(audioDevice);
            audioClassifier.on('result', (ev, timeMs, audioAsPcm) => {
                if (!ev.result.classification)
                    return;
                // print the raw predicted values for this frame
                // (turn into string here so the content does not jump around)
                // tslint:disable-next-line: no-unsafe-any
                let c = ev.result.classification;
                for (let k of Object.keys(c)) {
                    c[k] = c[k].toFixed(4);
                }
                console.log('classifyRes', timeMs + 'ms.', c);
                if (ev.info) {
                    console.log('additionalInfo:', ev.info);
                }
            });
        }
        else if (param.sensorType === 'camera') {
            console.log(RUNNER_PREFIX, 'Starting the image classifier for', model.project.owner + ' / ' + model.project.name, '(v' + model.project.deploy_version + ')');
            console.log(RUNNER_PREFIX, 'Parameters', 'image size', param.image_input_width + 'x' + param.image_input_height + ' px (' +
                param.image_channel_count + ' channels)', 'classes', param.labels);
            let camera = await connectCamera(configFactory);
            imageClassifier = new image_classifier_1.ImageClassifier(runner, camera);
            await imageClassifier.start();
            let webserverPort = await startWebServer(model, camera, imageClassifier);
            console.log('');
            console.log('Want to see a feed of the camera and live classification in your browser? ' +
                'Go to http://' + (get_ips_1.ips.length > 0 ? get_ips_1.ips[0].address : 'localhost') + ':' + webserverPort);
            console.log('');
            imageClassifier.on('result', (ev, timeMs, imgAsJpg) => {
                if (ev.result.classification) {
                    // print the raw predicted values for this frame
                    // (turn into string here so the content does not jump around)
                    // tslint:disable-next-line: no-unsafe-any
                    let c = ev.result.classification;
                    for (let k of Object.keys(c)) {
                        c[k] = c[k].toFixed(4);
                    }
                    console.log('classifyRes', timeMs + 'ms.', c);
                }
                else if (ev.result.bounding_boxes) {
                    console.log('boundingBoxes', timeMs + 'ms.', JSON.stringify(ev.result.bounding_boxes));
                }
                if (ev.info) {
                    console.log('additionalInfo:', ev.info);
                }
            });
        }
        else {
            throw new Error('Invalid sensorType: ' + param.sensorType);
        }
    }
    catch (ex) {
        console.warn(RUNNER_PREFIX, 'Failed to run impulse', ex);
        if (audioClassifier) {
            await audioClassifier.stop();
        }
        if (imageClassifier) {
            await imageClassifier.stop();
        }
        process.exit(1);
    }
})();
async function connectCamera(cf) {
    let camera;
    if (process.env.PROPHESEE_CAM === '1') {
        camera = new prophesee_1.Prophesee(verboseArgv);
    }
    else if (process.platform === 'darwin') {
        camera = new imagesnap_1.Imagesnap(verboseArgv);
    }
    else if (process.platform === 'linux') {
        camera = new gstreamer_1.GStreamer(verboseArgv);
    }
    else {
        throw new Error('Unsupported platform "' + process.platform + '"');
    }
    await camera.init();
    let device;
    const devices = await camera.listDevices();
    if (devices.length === 0) {
        throw new Error('Cannot find any webcams');
    }
    const storedCamera = await cf.getCamera();
    if (storedCamera && devices.find(d => d === storedCamera)) {
        device = storedCamera;
    }
    else if (devices.length === 1) {
        device = devices[0];
    }
    else {
        let inqRes = await inquirer_1.default.prompt([{
                type: 'list',
                choices: (devices || []).map(p => ({ name: p, value: p })),
                name: 'camera',
                message: 'Select a camera',
                pageSize: 20
            }]);
        device = inqRes.camera;
    }
    await cf.storeCamera(device);
    console.log(RUNNER_PREFIX, 'Using camera', device, 'starting...');
    await camera.start({
        device: device,
        intervalMs: 100,
    });
    camera.on('error', error => {
        if (isExiting)
            return;
        console.log(RUNNER_PREFIX, 'camera error', error);
        process.exit(1);
    });
    console.log(RUNNER_PREFIX, 'Connected to camera');
    return camera;
}
function buildWavFileBuffer(data, intervalMs) {
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
function checkFileExists(file) {
    return new Promise(resolve => {
        return fs_1.default.promises.access(file, fs_1.default.constants.F_OK)
            .then(() => resolve(true))
            .catch(() => resolve(false));
    });
}
function startWebServer(model, camera, imgClassifier) {
    const app = express();
    app.use(express.static(path_1.default.join(__dirname, '..', '..', '..', 'cli', 'linux', 'webserver', 'public')));
    const server = new http_1.default.Server(app);
    const io = socket_io_1.default(server);
    // you can also get the actual image being classified from 'imageClassifier.on("result")',
    // but then you're limited by the inference speed.
    // here we get a direct feed from the camera so we guarantee the fps that we set earlier.
    let nextFrame = Date.now();
    let processingFrame = false;
    camera.on('snapshot', async (data) => {
        if (nextFrame > Date.now() || processingFrame)
            return;
        processingFrame = true;
        let img;
        if (model.modelParameters.image_channel_count === 3) {
            img = sharp_1.default(data).resize({
                height: model.modelParameters.image_input_height,
                width: model.modelParameters.image_input_width
            });
        }
        else {
            img = sharp_1.default(data).resize({
                height: model.modelParameters.image_input_height,
                width: model.modelParameters.image_input_width
            }).toColourspace('b-w');
        }
        io.emit('image', {
            img: 'data:image/jpeg;base64,' + (await img.jpeg().toBuffer()).toString('base64')
        });
        nextFrame = Date.now() + 50;
        processingFrame = false;
    });
    imgClassifier.on('result', async (result, timeMs, imgAsJpg) => {
        io.emit('classification', {
            modelType: model.modelParameters.model_type,
            result: result.result,
            timeMs: timeMs,
            additionalInfo: result.info,
        });
    });
    io.on('connection', socket => {
        socket.emit('hello', {
            projectName: model.project.owner + ' / ' + model.project.name
        });
    });
    return new Promise((resolve) => {
        server.listen(Number(process.env.PORT) || 4912, process.env.HOST || '0.0.0.0', async () => {
            resolve((Number(process.env.PORT) || 4912));
        });
    });
}
//# sourceMappingURL=runner.js.map
