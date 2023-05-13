/// <reference types="node" />
import { EventEmitter } from 'tsee';
import { ICamera, ICameraStartOptions } from './icamera';
export declare class Imagesnap extends EventEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void;
    error: (message: string) => void;
}> implements ICamera {
    private _captureProcess?;
    private _tempDir?;
    private _watcher?;
    private _lastOptions?;
    private _keepAliveTimeout;
    private _verbose;
    private _isStarted;
    private _isRestarting;
    /**
     * Instantiate the imagesnap backend (on macOS)
     */
    constructor(verbose?: boolean);
    /**
     * Verify that all dependencies are installed
     */
    init(): Promise<void>;
    /**
     * List all available cameras
     */
    listDevices(): Promise<string[]>;
    /**
     * Start the capture process
     * @param options Specify the camera, and the required interval between snapshots
     */
    start(options: ICameraStartOptions): Promise<void>;
    stop(): Promise<void>;
    getLastOptions(): ICameraStartOptions | undefined;
    private timeoutCallback;
}
