"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxImpulseRunner = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const tsee_1 = require("tsee");
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const net_1 = __importDefault(require("net"));
class LinuxImpulseRunner {
    /**
     * Start a new impulse runner
     * @param path Path to the runner's executable
     */
    constructor(path) {
        this._runnerEe = new tsee_1.EventEmitter();
        this._id = 0;
        this._stopped = false;
        this._path = path_1.default.resolve(path);
    }
    /**
     * Initialize the runner
     * This returns information about the model
     */
    async init() {
        if (!await this.exists(this._path)) {
            throw new Error('Runner does not exist: ' + this._path);
        }
        let isSocket = (await fs_1.default.promises.stat(this._path)).isSocket();
        // if we have /dev/shm, use that (RAM backed, instead of SD card backed, better for wear)
        let osTmpDir = os_1.default.tmpdir();
        if (await this.exists('/dev/shm')) {
            osTmpDir = '/dev/shm';
        }
        let socketPath;
        if (isSocket) {
            socketPath = this._path;
        }
        else {
            let tempDir = await fs_1.default.promises.mkdtemp(path_1.default.join(osTmpDir, 'edge-impulse-cli'));
            socketPath = path_1.default.join(tempDir, 'runner.sock');
            // start the .eim file
            this._runner = child_process_1.spawn(this._path, [socketPath]);
            if (!this._runner.stdout) {
                throw new Error('stdout is null');
            }
            const onStdout = (data) => {
                stdout += data.toString('utf-8');
            };
            let stdout = '';
            this._runner.stdout.on('data', onStdout);
            if (this._runner.stderr) {
                this._runner.stderr.on('data', onStdout);
            }
            let exitCode;
            this._runner.on('exit', code => {
                exitCode = code;
                if (typeof code === 'number' && code !== 0) {
                    this._runnerEe.emit('error', 'Runner has exited with code ' + code);
                }
                this._runner = undefined;
                this._helloResponse = undefined;
                this._runnerEe.removeAllListeners();
            });
            while (typeof exitCode === 'undefined' && !await this.exists(socketPath)) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            if (typeof exitCode !== 'undefined') {
                throw new Error('Failed to start runner (code: ' + exitCode + '): ' + stdout);
            }
            this._runner.stdout.off('data', onStdout);
            if (this._runner.stderr) {
                this._runner.stderr.off('data', onStdout);
            }
        }
        // attach to the socket
        let bracesOpen = 0;
        let bracesClosed = 0;
        let line = '';
        this._socket = net_1.default.connect(socketPath);
        this._socket.on('data', data => {
            // uncomment this to see raw output
            // console.log('data', data.toString('utf-8'));
            for (let c of data.toString('utf-8').split('')) {
                line += c;
                if (c === '{') {
                    bracesOpen++;
                }
                else if (c === '}') {
                    bracesClosed++;
                    if (bracesClosed === bracesOpen) {
                        try {
                            let resp = JSON.parse(line);
                            this._runnerEe.emit('message', resp);
                        }
                        catch (ex2) {
                            let ex = ex2;
                            this._runnerEe.emit('error', ex.message || ex.toString());
                        }
                        line = '';
                        bracesClosed = 0;
                        bracesOpen = 0;
                    }
                }
                else if (bracesOpen === 0) {
                    line = line.substr(0, line.length - 1);
                }
            }
        });
        this._socket.on('error', error => {
            this._runnerEe.emit('error', error.message || error.toString());
        });
        await new Promise((resolve, reject) => {
            var _a, _b;
            (_a = this._socket) === null || _a === void 0 ? void 0 : _a.once('connect', resolve);
            (_b = this._socket) === null || _b === void 0 ? void 0 : _b.once('error', reject);
            setTimeout(() => {
                reject('Timeout when connecting to ' + socketPath);
            }, 10000);
        });
        return await this.sendHello();
    }
    /**
     * Stop the classification process
     */
    async stop() {
        this._stopped = true;
        if (!this._runner) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            if (this._runner) {
                this._runner.on('close', code => {
                    resolve();
                });
                this._runner.kill('SIGINT');
                setTimeout(() => {
                    if (this._runner) {
                        this._runner.kill('SIGHUP');
                    }
                }, 3000);
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Get information about the model, this is only available
     * after the runner has been initialized
     */
    getModel() {
        if (!this._helloResponse) {
            console.trace('getModel() runner is not initialized');
            throw new Error('Runner is not initialized');
        }
        return this._helloResponse;
    }
    /**
     * Classify data
     * @param data An array of numbers, already formatted according to the rules in
     *             https://docs.edgeimpulse.com/docs/running-your-impulse-locally-1
     */
    async classify(data) {
        let resp = await this.send({ classify: data });
        if (!resp.success) {
            throw new Error(resp.error);
        }
        return {
            result: resp.result,
            timing: resp.timing,
            info: resp.info
        };
    }
    /**
     * Classify data (continuous mode, pass in slice_size data)
     * @param data An array of numbers, already formatted according to the rules in
     *             https://docs.edgeimpulse.com/docs/running-your-impulse-locally-1
     */
    async classifyContinuous(data) {
        let resp = await this.send({
            classify_continuous: data,
        });
        if (!resp.success) {
            throw new Error(resp.error);
        }
        return {
            result: resp.result,
            timing: resp.timing,
            info: resp.info
        };
    }
    async sendHello() {
        let resp = await this.send({ hello: 1 });
        if (!resp.success) {
            throw new Error(resp.error);
        }
        let sensor = 'unknown';
        switch (resp.model_parameters.sensor) {
            case -1:
            default:
                sensor = 'unknown';
                break;
            case 1:
                sensor = 'microphone';
                break;
            case 2:
                sensor = 'accelerometer';
                break;
            case 3:
                sensor = 'camera';
                break;
            case 4:
                sensor = 'positional';
                break;
        }
        let data = {
            project: resp.project,
            modelParameters: { ...resp.model_parameters, sensorType: sensor }
        };
        if (!data.modelParameters.model_type) {
            data.modelParameters.model_type = 'classification';
        }
        if (typeof data.modelParameters.image_input_frames === 'undefined') {
            data.modelParameters.image_input_frames = 1;
        }
        this._helloResponse = data;
        return data;
    }
    send(msg) {
        return new Promise((resolve, reject) => {
            if (!this._socket) {
                console.trace('Runner is not initialized (runner.send)');
                return reject('Runner is not initialized');
            }
            let msgId = ++this._id;
            const onData = (resp) => {
                if (resp.id === msgId) {
                    if (this._runner) {
                        this._runner.off('exit', onExit);
                    }
                    this._runnerEe.off('message', onData);
                    resolve(resp);
                }
            };
            this._runnerEe.on('message', onData);
            this._socket.write(JSON.stringify(Object.assign(msg, {
                id: msgId
            })) + '\n');
            setTimeout(() => {
                reject('No response within 5 seconds');
            }, 5000);
            const onExit = (code) => {
                if (!this._stopped) {
                    reject('Process exited with ' + code);
                }
            };
            if (this._runner) {
                this._runner.on('exit', onExit);
            }
        });
    }
    /**
     * Whether a file exists (Node.js API cannot be converted using promisify)
     * @param path
     */
    async exists(path) {
        let exists = false;
        try {
            await util_1.default.promisify(fs_1.default.stat)(path);
            exists = true;
        }
        catch (ex) {
            /* noop */
        }
        return exists;
    }
}
exports.LinuxImpulseRunner = LinuxImpulseRunner;
//# sourceMappingURL=linux-impulse-runner.js.map