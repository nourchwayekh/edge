"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnerModelPath = exports.RunnerDownloader = void 0;
const tsee_1 = require("tsee");
const spawn_helper_1 = require("../../library/sensors/spawn-helper");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const BUILD_PREFIX = '\x1b[32m[BLD]\x1b[0m';
class RunnerDownloader extends tsee_1.EventEmitter {
    constructor(projectId, modelType, config, forceTarget, forceEngine) {
        super();
        this._projectId = projectId;
        this._config = config;
        this._modelType = modelType;
        this._forceTarget = forceTarget;
        this._forceEngine = forceEngine;
    }
    async getDownloadType() {
        if (this._forceTarget) {
            return this._forceTarget;
        }
        let downloadType;
        if (process.platform === 'darwin') {
            if (process.arch !== 'x64' && process.arch !== 'arm64') {
                throw new Error('Unsupported architecture "' + process.arch + '", only ' +
                    'x64 or arm64 supported for now');
            }
            downloadType = 'runner-mac-x86_64';
        }
        else if (process.platform === 'linux') {
            if (process.arch === 'arm') {
                let uname = (await spawn_helper_1.spawnHelper('uname', ['-m'])).trim();
                if (uname !== 'armv7l') {
                    throw new Error('Unsupported architecture "' + uname + '", only ' +
                        'armv7l or aarch64 supported for now');
                }
                downloadType = 'runner-linux-armv7';
            }
            else if (process.arch === 'arm64') {
                let uname = (await spawn_helper_1.spawnHelper('uname', ['-m'])).trim();
                if (uname !== 'aarch64') {
                    throw new Error('Unsupported architecture "' + uname + '", only ' +
                        'armv7l or aarch64 supported for now');
                }
                if (fs_1.default.existsSync("/dev/drpai0")) {
                    downloadType = 'runner-linux-aarch64-rzv2l';
                }
                else if (fs_1.default.existsSync('/dev/akida0')) {
                    downloadType = 'runner-linux-aarch64-akd1000';
                }
                else {
                    downloadType = 'runner-linux-aarch64';
                }
            }
            else if (process.arch === 'x64') {
                if (fs_1.default.existsSync('/dev/akida0')) {
                    downloadType = 'runner-linux-aarch64-akd1000';
                }
                else {
                    downloadType = 'runner-linux-x86_64';
                }
            }
            else {
                throw new Error('Unsupported architecture "' + process.arch + '", only ' +
                    'arm supported for now');
            }
        }
        else {
            throw new Error('Unsupported platform "' + process.platform + '"');
        }
        return downloadType;
    }
    async getLastDeploymentVersion() {
        let downloadType = await this.getDownloadType();
        let deployInfo = await this._config.api.deployment.getDeployment(this._projectId, { type: downloadType, modelType: this._modelType });
        return deployInfo.hasDeployment && typeof deployInfo.version === 'number' ?
            deployInfo.version :
            null;
    }
    async downloadDeployment() {
        let downloadType = await this.getDownloadType();
        let deployInfo = await this._config.api.deployment.getDeployment(this._projectId, { type: downloadType, modelType: this._modelType });
        if (!deployInfo.hasDeployment) {
            await this.buildModel(downloadType);
        }
        let deployment = await this._config.api.deployment.downloadBuild(this._projectId, { type: downloadType, modelType: this._modelType });
        return deployment;
    }
    async buildModel(downloadType) {
        // list all deploy targets
        const dt = await this._config.api.deployment.listDeploymentTargetsForProjectDataSources(this._projectId);
        let deployInfo = dt.targets.find(x => x.format === downloadType);
        if (!deployInfo) {
            throw new Error('Failed to find deployment type "' + downloadType + '", types found: ' +
                JSON.stringify(dt.targets.map(x => x.format)));
        }
        let engine = deployInfo.preferredEngine;
        if (this._forceEngine) {
            if (!deployInfo.supportedEngines.find(x => x === this._forceEngine)) {
                throw new Error('Engine type "' + this._forceEngine + '" is not supported for ' +
                    '"' + downloadType + '", valid engines: ' + JSON.stringify(deployInfo.supportedEngines));
            }
            engine = this._forceEngine;
        }
        let buildRes = await this._config.api.jobs.buildOnDeviceModelJob(this._projectId, {
            engine: engine,
            modelType: this._modelType
        }, { type: downloadType });
        let jobId = buildRes.id;
        this.emit('build-progress', 'Created build job with ID ' + jobId);
        await this._config.api.runJobUntilCompletion({
            type: 'project',
            projectId: this._projectId,
            jobId: jobId
        }, d => {
            console.log(BUILD_PREFIX, d.trim());
        });
    }
}
exports.RunnerDownloader = RunnerDownloader;
class RunnerModelPath {
    constructor(projectId, modelType, forceTarget, forceEngine) {
        this._projectId = projectId;
        this._modelType = modelType;
        this._forceTarget = forceTarget;
        this._forceEngine = forceEngine;
    }
    getModelPath(version) {
        let versionId = 'v' + version;
        if (this._modelType === 'int8') {
            versionId += '-quantized';
        }
        if (this._forceTarget) {
            versionId += '-' + this._forceTarget;
        }
        if (this._forceEngine) {
            versionId += '-' + this._forceEngine;
        }
        return path_1.default.join(os_1.default.homedir(), '.ei-linux-runner', 'models', this._projectId + '', versionId, 'model.eim');
    }
}
exports.RunnerModelPath = RunnerModelPath;
//# sourceMappingURL=runner-downloader.js.map