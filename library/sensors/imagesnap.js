"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Imagesnap = void 0;
const child_process_1 = require("child_process");
const tsee_1 = require("tsee");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const spawn_helper_1 = require("./spawn-helper");
const PREFIX = '\x1b[35m[SNP]\x1b[0m';
class Imagesnap extends tsee_1.EventEmitter {
    /**
     * Instantiate the imagesnap backend (on macOS)
     */
    constructor(verbose = false) {
        super();
        this._isStarted = false;
        this._isRestarting = false;
        this._verbose = verbose;
    }
    /**
     * Verify that all dependencies are installed
     */
    async init() {
        try {
            await spawn_helper_1.spawnHelper('which', ['imagesnap']);
        }
        catch (ex) {
            throw new Error('Missing "imagesnap" in PATH. Install via `brew install imagesnap`');
        }
    }
    /**
     * List all available cameras
     */
    async listDevices() {
        let devices = await spawn_helper_1.spawnHelper('imagesnap', ['-l']);
        let names = devices.split('\n').filter(l => l.startsWith('<') || l.startsWith('=>')).map(l => {
            // Big Sur
            if (l.startsWith('=>')) {
                return l.substr(3).trim();
            }
            // Catalina
            let name = l.split('[')[1];
            return name.substr(0, name.length - 1);
        });
        return names;
    }
    /**
     * Start the capture process
     * @param options Specify the camera, and the required interval between snapshots
     */
    async start(options) {
        if (this._captureProcess) {
            throw new Error('Capture was already started');
        }
        this._lastOptions = options;
        this._tempDir = await fs_1.default.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'edge-impulse-cli'));
        const devices = await this.listDevices();
        if (!devices.find(d => d === options.device)) {
            throw new Error('Invalid device ' + options.device);
        }
        this._captureProcess = child_process_1.spawn('imagesnap', [
            '-d', options.device,
            '-t', (options.intervalMs / 1000).toString()
        ], { cwd: this._tempDir });
        if (this._verbose) {
            console.log(PREFIX, 'Starting with:', ['imagesnap',
                '-d', options.device,
                '-t', (options.intervalMs / 1000).toString()
            ].join(' '));
        }
        const launchStdout = (data) => {
            if (this._verbose) {
                console.log(PREFIX, data.toString('utf-8'));
            }
        };
        if (this._captureProcess.stdout) {
            this._captureProcess.stdout.on('data', launchStdout);
        }
        if (this._captureProcess.stderr) {
            this._captureProcess.stderr.on('data', launchStdout);
        }
        this._watcher = fs_1.default.watch(this._tempDir, async (eventType, fileName) => {
            if (eventType === 'rename' && fileName.endsWith('.jpg') && this._tempDir) {
                if (this._keepAliveTimeout) {
                    clearTimeout(this._keepAliveTimeout);
                }
                try {
                    let data = await fs_1.default.promises.readFile(path_1.default.join(this._tempDir, fileName));
                    this.emit('snapshot', data, path_1.default.basename(fileName));
                    // 2 seconds no new data? trigger timeout
                    if (this._keepAliveTimeout) {
                        clearTimeout(this._keepAliveTimeout);
                    }
                    this._keepAliveTimeout = setTimeout(() => {
                        // tslint:disable-next-line: no-floating-promises
                        this.timeoutCallback();
                    }, 2000);
                }
                catch (ex) {
                    console.error('Failed to load file', path_1.default.join(this._tempDir, fileName));
                }
            }
        });
        let startRes = new Promise((resolve, reject) => {
            if (this._captureProcess) {
                let cp = this._captureProcess;
                this._captureProcess.on('close', code => {
                    if (this._keepAliveTimeout) {
                        clearTimeout(this._keepAliveTimeout);
                    }
                    if (typeof code === 'number') {
                        reject('Capture process failed with code ' + code);
                    }
                    else {
                        reject('Failed to start capture process, but no exit code. ' +
                            'This might be a permissions issue. ' +
                            'Are you running this command from a simulated shell (like in Visual Studio Code)?');
                    }
                    // already started and we're the active process?
                    if (this._isStarted && cp === this._captureProcess && !this._isRestarting) {
                        this.emit('error', 'imagesnap process was killed with code (' + code + ')');
                    }
                    this._captureProcess = undefined;
                });
            }
            // tslint:disable-next-line: no-floating-promises
            (async () => {
                if (!this._tempDir) {
                    throw new Error('tempDir is undefined');
                }
                const watcher = fs_1.default.watch(this._tempDir, () => {
                    resolve();
                    watcher.close();
                });
                setTimeout(() => {
                    if (this._keepAliveTimeout) {
                        clearTimeout(this._keepAliveTimeout);
                    }
                    return reject('First photo was not created within 10 seconds');
                }, 10000);
            })();
        });
        // don't log anymore after process is launched / exited
        const clearLaunchStdout = () => {
            if (!this._captureProcess)
                return;
            if (this._captureProcess.stdout) {
                this._captureProcess.stdout.off('data', launchStdout);
            }
            if (this._captureProcess.stderr) {
                this._captureProcess.stderr.off('data', launchStdout);
            }
        };
        startRes.then(() => {
            clearLaunchStdout();
            this._isStarted = true;
        }).catch(clearLaunchStdout);
        return startRes;
    }
    async stop() {
        if (this._keepAliveTimeout) {
            clearTimeout(this._keepAliveTimeout);
        }
        let stopRes = new Promise((resolve) => {
            if (this._captureProcess) {
                this._captureProcess.on('close', code => {
                    if (this._watcher) {
                        this._watcher.close();
                    }
                    resolve();
                });
                this._captureProcess.kill('SIGINT');
                setTimeout(() => {
                    if (this._captureProcess) {
                        this._captureProcess.kill('SIGHUP');
                    }
                }, 500);
            }
            else {
                resolve();
            }
        });
        // set isStarted to false
        stopRes
            .then(() => { this._isStarted = false; })
            .catch(() => { this._isStarted = false; });
        return stopRes;
    }
    getLastOptions() {
        return this._lastOptions;
    }
    async timeoutCallback() {
        try {
            this._isRestarting = true;
            if (this._verbose) {
                console.log(PREFIX, 'No images received for 2 seconds, restarting...');
            }
            await this.stop();
            if (this._verbose) {
                console.log(PREFIX, 'Stopped');
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (this._lastOptions) {
                if (this._verbose) {
                    console.log(PREFIX, 'Starting imagesnap processing...');
                }
                await this.start(this._lastOptions);
                if (this._verbose) {
                    console.log(PREFIX, 'Restart completed');
                }
            }
            else {
                this.emit('error', 'imagesnap process went stale');
            }
        }
        catch (ex2) {
            let ex = ex2;
            this.emit('error', 'imagesnap failed to restart: ' + (ex.message || ex.toString()));
        }
        finally {
            this._isRestarting = false;
        }
    }
}
exports.Imagesnap = Imagesnap;
//# sourceMappingURL=imagesnap.js.map