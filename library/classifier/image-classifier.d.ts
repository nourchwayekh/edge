/// <reference types="node" />
import { EventEmitter } from "tsee";
import { LinuxImpulseRunner, RunnerClassifyResponseSuccess } from "./linux-impulse-runner";
import { ICamera } from "../sensors/icamera";
export declare class ImageClassifier extends EventEmitter<{
    result: (result: RunnerClassifyResponseSuccess, timeMs: number, imgAsJpeg: Buffer) => void;
}> {
    private _runner;
    private _camera;
    private _stopped;
    private _runningInference;
    /**
     * Classifies realtime image data from a camera
     * @param runner An initialized impulse runner instance
     * @param camera An initialized ICamera instance
     */
    constructor(runner: LinuxImpulseRunner, camera: ICamera);
    /**
     * Start the image classifier
     */
    start(): Promise<void>;
    /**
     * Stop the classifier
     */
    stop(): Promise<void>;
    private resizeImage;
}
