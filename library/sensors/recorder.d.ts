/// <reference types="node" />
import { EventEmitter } from 'tsee';
export interface AudioRecorderOptionsNullable {
    sampleRate?: number;
    channels?: number;
    compress?: boolean;
    threshold?: number;
    thresholdStart?: number;
    thresholdEnd?: number;
    silence?: number;
    verbose?: boolean;
    audioType?: string;
    asRaw?: boolean;
}
export interface AudioInstance {
    ee: EventEmitter<{
        data: (b: Buffer) => void;
    }>;
    stop: () => Promise<void>;
}
export declare class AudioRecorder {
    private _cp?;
    private _options;
    constructor(options: AudioRecorderOptionsNullable);
    start(device: string): Promise<AudioInstance>;
    static ListDevices(): Promise<{
        name: string;
        id: string;
    }[]>;
    private stop;
    private static exists;
}
