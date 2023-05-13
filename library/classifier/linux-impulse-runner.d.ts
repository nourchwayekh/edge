export declare type RunnerHelloResponseModelParameters = {
    axis_count: number;
    frequency: number;
    has_anomaly: number;
    input_features_count: number;
    image_input_height: number;
    image_input_width: number;
    image_input_frames: number;
    image_channel_count: number;
    interval_ms: number;
    label_count: number;
    sensor: number;
    labels: string[];
    model_type: 'classification' | 'object_detection' | 'constrained_object_detection';
    slice_size: undefined | number;
    use_continuous_mode: undefined | boolean;
};
export declare type RunnerHelloResponseProject = {
    deploy_version: number;
    id: number;
    name: string;
    owner: string;
};
export declare type RunnerClassifyResponseSuccess = {
    result: {
        classification?: {
            [k: string]: number;
        };
        bounding_boxes?: {
            label: string;
            value: number;
            x: number;
            y: number;
            width: number;
            height: number;
        }[];
        anomaly?: number;
    };
    timing: {
        dsp: number;
        classification: number;
        anomaly: number;
    };
    info?: string;
};
export declare type ModelInformation = {
    project: RunnerHelloResponseProject;
    modelParameters: RunnerHelloResponseModelParameters & {
        sensorType: 'unknown' | 'accelerometer' | 'microphone' | 'camera' | 'positional';
    };
};
export declare class LinuxImpulseRunner {
    private _path;
    private _runner;
    private _helloResponse;
    private _runnerEe;
    private _id;
    private _stopped;
    private _socket;
    /**
     * Start a new impulse runner
     * @param path Path to the runner's executable
     */
    constructor(path: string);
    /**
     * Initialize the runner
     * This returns information about the model
     */
    init(): Promise<ModelInformation>;
    /**
     * Stop the classification process
     */
    stop(): Promise<void>;
    /**
     * Get information about the model, this is only available
     * after the runner has been initialized
     */
    getModel(): ModelInformation;
    /**
     * Classify data
     * @param data An array of numbers, already formatted according to the rules in
     *             https://docs.edgeimpulse.com/docs/running-your-impulse-locally-1
     */
    classify(data: number[]): Promise<RunnerClassifyResponseSuccess>;
    /**
     * Classify data (continuous mode, pass in slice_size data)
     * @param data An array of numbers, already formatted according to the rules in
     *             https://docs.edgeimpulse.com/docs/running-your-impulse-locally-1
     */
    classifyContinuous(data: number[]): Promise<RunnerClassifyResponseSuccess>;
    private sendHello;
    private send;
    /**
     * Whether a file exists (Node.js API cannot be converted using promisify)
     * @param path
     */
    private exists;
}
