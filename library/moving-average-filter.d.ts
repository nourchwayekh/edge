import { RunnerClassifyResponseSuccess } from "./classifier/linux-impulse-runner";
export declare class MovingAverageFilter {
    private _filterSize;
    private _state;
    /**
     * Create a moving average filter to smooth over results
     * @param filterSize Size of the filter, e.g. number of classifications per second for audio models
     * @param labels All labels in the model
     */
    constructor(filterSize: number, labels: string[]);
    /**
     * Apply the moving average filter over incoming results
     * @param result Classification results
     * @returns Classification results with the filter applied
     */
    run(result: RunnerClassifyResponseSuccess): RunnerClassifyResponseSuccess & {
        result: {
            classification?: {
                [k: string]: number;
            } | undefined;
            bounding_boxes?: {
                label: string;
                value: number;
                x: number;
                y: number;
                width: number;
                height: number;
            }[] | undefined;
            anomaly?: number | undefined;
        } & {
            classification: {
                [k: string]: number;
            };
        };
    };
}
