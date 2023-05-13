/// <reference types="node" />
import { EdgeImpulseConfig } from "../config";
import { EventEmitter } from 'tsee';
export declare class RunnerDownloader extends EventEmitter<{
    'build-progress': (msg: string) => void;
}> {
    private _projectId;
    private _config;
    private _modelType;
    private _forceTarget;
    private _forceEngine;
    constructor(projectId: number, modelType: 'int8' | 'float32', config: EdgeImpulseConfig, forceTarget: string | undefined, forceEngine: string | undefined);
    getDownloadType(): Promise<string>;
    getLastDeploymentVersion(): Promise<number | null>;
    downloadDeployment(): Promise<Buffer>;
    private buildModel;
}
export declare class RunnerModelPath {
    private _projectId;
    private _modelType;
    private _forceTarget;
    private _forceEngine;
    constructor(projectId: number, modelType: 'int8' | 'float32', forceTarget: string | undefined, forceEngine: string | undefined);
    getModelPath(version: number): string;
}
