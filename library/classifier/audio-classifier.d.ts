/// <reference types="node" />
import { EventEmitter } from "tsee";
import { LinuxImpulseRunner, RunnerClassifyResponseSuccess } from "./linux-impulse-runner";
export declare class AudioClassifier extends EventEmitter<{
    result: (result: RunnerClassifyResponseSuccess, timeMs: number, audioBuffer: Buffer) => void;
    noAudioError: () => void;
}> {
    private _runner;
    private _recorder;
    private _audio;
    private _stopped;
    private _verbose;
    /**
     * Classifies realtime audio data
     * @param runner An instance of the initialized impulse runner
     * @param verbose Whether to log debug info
     */
    constructor(runner: LinuxImpulseRunner, verbose?: boolean);
    /**
     * Start the audio classifier
     * @param sliceLengthMs Slice length in milliseconds (runs inference every X ms.)
     *                      this is ignored if the model has a fixed slice_size
     *                      (true for all new models)
     */
    start(device: string, sliceLengthMs?: number): Promise<void>;
    /**
     * Stop the audio classifier
     */
    stop(): Promise<void>;
}
