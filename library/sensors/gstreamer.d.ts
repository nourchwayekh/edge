/// <reference types="node" />
import { EventEmitter } from 'tsee';
import { SpawnHelperType } from './spawn-helper';
import { ICamera, ICameraStartOptions } from './icamera';
declare type GStreamerCap = {
    type: 'video/x-raw' | 'image/jpeg' | 'nvarguscamerasrc';
    width: number;
    height: number;
    framerate: number;
};
export declare class GStreamer extends EventEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void;
    error: (message: string) => void;
}> implements ICamera {
    private _captureProcess?;
    private _tempDir?;
    private _watcher?;
    private _handledFiles;
    private _verbose;
    private _lastHash;
    private _processing;
    private _lastOptions?;
    private _mode;
    private _keepAliveTimeout;
    private _isStarted;
    private _isRestarting;
    private _spawnHelper;
    constructor(verbose: boolean, spawnHelperOverride?: SpawnHelperType);
    init(): Promise<void>;
    listDevices(): Promise<string[]>;
    start(options: ICameraStartOptions): Promise<void>;
    stop(): Promise<void>;
    getAllDevices(): Promise<{
        id: string;
        name: string;
        caps: GStreamerCap[];
    }[]>;
    private listNvarguscamerasrcDevices;
    getLastOptions(): ICameraStartOptions | undefined;
    private exists;
    private timeoutCallback;
}
export {};
