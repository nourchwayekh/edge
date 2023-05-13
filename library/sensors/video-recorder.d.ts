/// <reference types="node" />
import { ICamera } from "./icamera";
import { EventEmitter } from 'tsee';
export declare class VideoRecorder {
    private _camera;
    private _verbose;
    constructor(camera: ICamera, verbose: boolean);
    record(timeMs: number): Promise<EventEmitter<{
        processing: () => void;
        error: (err: string) => void;
        done: (buffer: Buffer) => void;
    }>>;
    private exists;
    private rmDir;
    /**
     * Unlinks a file, but does not throw if unlinking fails
     * @param path
     */
    private safeUnlinkFile;
}
