/// <reference types="node" />
import { EventEmitter } from 'tsee';
import { ICamera, ICameraStartOptions } from './icamera';
export declare class Prophesee extends EventEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void;
    error: (message: string) => void;
}> implements ICamera {
    private _captureProcess?;
    private _tempDir?;
    private _watcher?;
    private _verbose;
    private _handledFiles;
    private _lastHash;
    private _processing;
    private _lastOptions?;
    /**
     * Instantiate the prophesee backend
     */
    constructor(verbose: boolean);
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
    private exists;
}
