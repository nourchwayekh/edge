#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const imagesnap_1 = require("../../library/sensors/imagesnap");
const inquirer_1 = __importDefault(require("inquirer"));
const gstreamer_1 = require("../../library/sensors/gstreamer");
const get_ips_1 = require("../../library/get-ips");
const commander_1 = __importDefault(require("commander"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prophesee_1 = require("../../library/sensors/prophesee");
const express = require("express");
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const packageVersion = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8')).version;
commander_1.default
    .description('Edge Impulse Camera debug client ' + packageVersion)
    .version(packageVersion)
    .option('--verbose', 'Enable debug logs')
    .option('--fps <fps>', 'Frames per second (default: 30)')
    .option('--width <px>', 'Desired width of the camera stream')
    .option('--height <px>', 'Desired height of the camera stream')
    .allowUnknownOption(true)
    .parse(process.argv);
const verboseArgv = !!commander_1.default.verbose;
const isProphesee = process.env.PROPHESEE_CAM === '1';
const fps = commander_1.default.fps ? Number(commander_1.default.fps) : 30;
const dimensions = commander_1.default.width && commander_1.default.height ? {
    width: Number(commander_1.default.width),
    height: Number(commander_1.default.height)
} : undefined;
if ((commander_1.default.width && !commander_1.default.height) || (!commander_1.default.width && commander_1.default.height)) {
    console.error('--width and --height need to either be both specified or both omitted');
    process.exit(1);
}
const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';
let isExiting = false;
// tslint:disable-next-line: no-floating-promises
(async () => {
    let camera;
    try {
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
        let cameraDevice;
        const cameraDevices = await camera.listDevices();
        if (cameraDevices.length === 0) {
            throw new Error('Cannot find any webcams, run this command with --disable-camera to skip selection');
        }
        if (cameraDevices.length === 1) {
            cameraDevice = cameraDevices[0];
        }
        else {
            let inqRes = await inquirer_1.default.prompt([{
                    type: 'list',
                    choices: (cameraDevices || []).map(p => ({ name: p, value: p })),
                    name: 'camera',
                    message: 'Select a camera',
                    pageSize: 20
                }]);
            cameraDevice = inqRes.camera;
        }
        console.log(SERIAL_PREFIX, 'Using camera', cameraDevice, 'starting (' + fps + ' fps)...');
        await camera.start({
            device: cameraDevice,
            intervalMs: 1000 / fps,
            dimensions: dimensions
        });
        camera.on('error', error => {
            if (isExiting)
                return;
            console.log('camera error', error);
            process.exit(1);
        });
        console.log(SERIAL_PREFIX, 'Connected to camera');
        let webserverPort = await startWebServer(camera, cameraDevice);
        console.log('');
        console.log('To see a feed of the camera and live classification in your browser? ' +
            'Go to http://' + (get_ips_1.ips.length > 0 ? get_ips_1.ips[0].address : 'localhost') + ':' + webserverPort);
        console.log('');
    }
    catch (ex) {
        console.error('Failed to initialize linux tool', ex);
        if (camera) {
            await camera.stop();
        }
        process.exit(1);
    }
})();
function startWebServer(camera, cameraName) {
    const app = express();
    app.use(express.static(path_1.default.join(__dirname, '..', '..', '..', 'cli', 'linux', 'webserver', 'public')));
    const server = new http_1.default.Server(app);
    const io = socket_io_1.default(server);
    camera.on('snapshot', async (data, fileName) => {
        io.emit('image', {
            img: 'data:image/jpeg;base64,' + data.toString('base64'),
            fileName: fileName
        });
    });
    io.on('connection', socket => {
        socket.emit('hello', {
            projectName: 'Camera debugger (' + cameraName + ')'
        });
    });
    return new Promise((resolve) => {
        server.listen(Number(process.env.PORT) || 4913, process.env.HOST || '0.0.0.0', async () => {
            resolve((Number(process.env.PORT) || 4913));
        });
    });
}
//# sourceMappingURL=camera-debug.js.map