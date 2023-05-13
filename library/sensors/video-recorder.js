"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRecorder = void 0;
const os_1 = __importDefault(require("os"));
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const tsee_1 = require("tsee");
const spawn_helper_1 = require("./spawn-helper");
const PREFIX = '\x1b[35m[VID]\x1b[0m';
class VideoRecorder {
    constructor(camera, verbose) {
        this._camera = camera;
        this._verbose = verbose;
    }
    async record(timeMs) {
        try {
            await spawn_helper_1.spawnHelper('which', ['ffmpeg']);
        }
        catch (ex) {
            throw new Error('Missing "ffmpeg" in PATH. Install via `sudo apt install -y ffmpeg`');
        }
        let ee = new tsee_1.EventEmitter();
        // if we have /dev/shm, use that (RAM backed, instead of SD card backed, better for wear)
        let osTmpDir = os_1.default.tmpdir();
        if (await this.exists('/dev/shm')) {
            osTmpDir = '/dev/shm';
        }
        let lastCameraOptions = this._camera.getLastOptions();
        if (!lastCameraOptions) {
            throw new Error('Could not get last camera options');
        }
        let frequency = 1000 / lastCameraOptions.intervalMs;
        let expectedFrames = Math.ceil((timeMs / 1000) * frequency);
        let tempDir = await fs_1.default.promises.mkdtemp(path_1.default.join(osTmpDir, 'edge-impulse-cli'));
        // tslint:disable-next-line: no-floating-promises
        (async () => {
            let fileIx = 0;
            let hasError = false;
            const onSnapshot = async (data) => {
                try {
                    let filename = 'image' + (++fileIx).toString().padStart(5, '0') + '.jpg';
                    await fs_1.default.promises.writeFile(path_1.default.join(tempDir, filename), data);
                }
                catch (ex) {
                    let ex2 = ex;
                    await onError(ex2);
                }
            };
            const onError = async (err) => {
                if (this._verbose) {
                    console.log(PREFIX, 'Error', err.message || err.toString());
                }
                this._camera.off('snapshot', onSnapshot);
                ee.emit('error', err.message || err.toString());
                hasError = true;
                await this.rmDir(tempDir);
            };
            this._camera.on('snapshot', onSnapshot);
            // wait for n frames...
            await new Promise((resolve) => {
                let framesLeft = expectedFrames;
                const onSnapshot2 = () => {
                    if (--framesLeft === 0) {
                        this._camera.off('snapshot', onSnapshot2);
                        resolve();
                    }
                    if (this._verbose && (framesLeft % 10 === 0)) {
                        console.log(PREFIX, 'frames left', framesLeft);
                    }
                };
                this._camera.on('snapshot', onSnapshot2);
            });
            this._camera.off('snapshot', onSnapshot);
            if (hasError)
                return;
            ee.emit('processing');
            let outFile = path_1.default.join(tempDir, 'out.mp4');
            if (this._verbose) {
                console.log(PREFIX, 'Found ' +
                    (await fs_1.default.promises.readdir(tempDir)).filter(x => x.endsWith('.jpg')).length +
                    ' files, combining them into a video...');
            }
            try {
                await spawn_helper_1.spawnHelper('ffmpeg', [
                    '-r', '25',
                    '-f', 'image2',
                    '-s', '1280x720',
                    '-i', 'image%05d.jpg',
                    '-vcodec', 'libx264',
                    '-preset', 'ultrafast',
                    '-crf', '25',
                    '-pix_fmt', 'yuv420p',
                    outFile
                ], {
                    ignoreErrors: false,
                    cwd: tempDir
                });
            }
            catch (ex2) {
                let ex = ex2;
                return onError(ex);
            }
            let outBuffer = await fs_1.default.promises.readFile(outFile);
            if (this._verbose) {
                console.log(PREFIX, 'Converted images into video, ' + outBuffer.length + ' bytes');
            }
            ee.emit('done', outBuffer);
            await this.rmDir(tempDir);
        })();
        return ee;
    }
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
    async rmDir(folder) {
        if (!(await this.exists(folder)))
            return;
        const readdir = util_1.default.promisify(fs_1.default.readdir);
        let entries = await readdir(folder, { withFileTypes: true });
        await Promise.all(entries.map(async (entry) => {
            // skip .nfs files in the EFS storage layer
            if (entry.name.startsWith('.nfs'))
                return;
            let fullPath = path_1.default.join(folder, entry.name);
            return entry.isDirectory() ? this.rmDir(fullPath) : this.safeUnlinkFile(fullPath);
        }));
        try {
            await util_1.default.promisify(fs_1.default.rmdir)(folder);
        }
        catch (ex) {
            // OK not great but OK there are some issues with removing files from EFS
            console.warn('Failed to remove', folder, ex);
        }
    }
    /**
     * Unlinks a file, but does not throw if unlinking fails
     * @param path
     */
    async safeUnlinkFile(path) {
        try {
            await util_1.default.promisify(fs_1.default.unlink)(path);
        }
        catch (ex) {
            /* noop */
        }
    }
}
exports.VideoRecorder = VideoRecorder;
//# sourceMappingURL=video-recorder.js.map