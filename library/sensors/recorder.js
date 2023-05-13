"use strict";
// based on https://github.com/leon3s/node-mic-record (MIT licensed)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioRecorder = void 0;
const child_process_1 = require("child_process");
const tsee_1 = require("tsee");
const spawn_helper_1 = require("./spawn-helper");
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const PREFIX = '\x1b[35m[AUD]\x1b[0m';
class AudioRecorder {
    constructor(options) {
        let defaults = {
            sampleRate: 16000,
            channels: 1,
            compress: false,
            threshold: 0.5,
            thresholdStart: null,
            thresholdEnd: null,
            silence: 1.0,
            verbose: false,
            audioType: 'wav',
            asRaw: false,
        };
        this._options = Object.assign(defaults, options);
    }
    async start(device) {
        let cmd;
        let cmdArgs;
        let cmdOptions;
        let audioType;
        cmd = "sox";
        audioType = "wav";
        if (this._options.audioType)
            audioType = this._options.audioType;
        if (this._options.asRaw)
            audioType = "raw";
        if (process.platform === 'linux') {
            cmdArgs = ['-t', 'alsa', device];
        }
        else if (process.platform === 'darwin') {
            cmdArgs = ['-t', 'coreaudio', device];
        }
        else {
            console.warn(PREFIX, 'WARN: Could not detect platform, using default audio device');
            cmdArgs = ['-d'];
        }
        cmdArgs = cmdArgs.concat([
            '-q',
            '-r', this._options.sampleRate.toString(),
            '-c', '1',
            '-e', 'signed-integer',
            '-b', '16',
            '-t', audioType,
            '-'
        ]);
        try {
            await spawn_helper_1.spawnHelper('which', [cmd]);
        }
        catch (ex) {
            throw new Error(`Missing "${cmd}" in PATH.`);
        }
        cmdOptions = {};
        // This does not appear to work
        // if (this._options.device) {
        //     cmdOptions.env = Object.assign({ }, process.env, {
        //         AUDIODEV: this._options.device
        //     });
        // }
        // Spawn audio capture command
        this._cp = child_process_1.spawn(cmd, cmdArgs, cmdOptions);
        if (this._options.verbose) {
            console.log('Recording via: ', cmd, cmdArgs, cmdOptions);
        }
        let rec = this._cp.stdout;
        if (!rec) {
            throw new Error('stdout is null');
        }
        if (this._options.verbose) {
            console.log('Recording', this._options.channels, 'channels with sample rate', this._options.sampleRate + '...');
            console.time('End Recording');
            rec.on('data', (data) => {
                console.log('Recording %d bytes', data.length, data);
            });
            rec.on('end', () => {
                console.timeEnd('End Recording');
            });
        }
        let ee = new tsee_1.EventEmitter();
        rec.on('data', (data) => ee.emit('data', data));
        return new Promise((resolve, reject) => {
            if (!this._cp || !rec || !this._cp.stderr) {
                return reject('cp is null');
            }
            let err = '';
            this._cp.stderr.on('data', (data) => err += data.toString('utf-8'));
            this._cp.on('error', reject);
            this._cp.on('close', (code) => {
                return reject(cmd + ' exited with code ' + code + ': ' + err);
            });
            // first data segment will resolve
            rec.once('data', () => {
                resolve({
                    ee: ee,
                    stop: this.stop.bind(this)
                });
            });
            setTimeout(() => {
                reject('Timeout when waiting for audio recording to start');
            }, 10000);
        });
    }
    static async ListDevices() {
        if (await this.exists('/proc/asound/cards')) {
            let devices = [];
            let data = await fs_1.default.promises.readFile('/proc/asound/cards', 'utf-8');
            let audioDevices = data.split('\n').map(d => d.trim()).filter(d => d.match(/^(\d+) .*?\]\: (.+)$/));
            for (let d of audioDevices) {
                let m = d.match(/^(\d+) .*?\]\: (.+)$/);
                if (m && m.length >= 3) {
                    devices.push({
                        name: m[2],
                        id: 'hw:' + m[1] + ',0'
                    });
                }
            }
            return devices;
        }
        else if (process.platform === 'darwin') {
            try {
                await spawn_helper_1.spawnHelper('which', ['sox']);
            }
            catch (ex) {
                throw new Error(`Missing "sox" in PATH.`);
            }
            let data = await spawn_helper_1.spawnHelper('sox', [
                '-V6',
                '-n',
                '-t',
                'coreaudio',
                'testtesttest'
            ], { ignoreErrors: true });
            let devices = [...new Set(data.split('\n')
                    .filter(d => d.startsWith('sox INFO coreaudio: Found Audio Device'))
                    .map(d => d.split('Found Audio Device ')[1])
                    .map(d => d.substr(1, d.length - 2)))
            ];
            return devices.map(d => {
                return {
                    name: d,
                    id: d
                };
            });
        }
        else {
            return [{
                    name: 'Default audio device',
                    id: ''
                }];
        }
    }
    stop() {
        if (!this._cp) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            if (this._cp) {
                this._cp.on('close', code => {
                    resolve();
                });
                this._cp.kill('SIGINT');
                setTimeout(() => {
                    if (this._cp) {
                        this._cp.kill('SIGHUP');
                    }
                }, 3000);
            }
            else {
                resolve();
            }
        });
    }
    static async exists(path) {
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
exports.AudioRecorder = AudioRecorder;
//# sourceMappingURL=recorder.js.map