export declare class DataForwarder {
    private _options;
    private _samples;
    constructor(options: {
        deviceId?: string;
        deviceType: string;
        sensors: {
            name: string;
            units: string;
        }[];
        intervalMs?: number;
        frequency?: number;
        host?: string;
        hmacKey?: string;
        apiKey: string;
    });
    addData(data: number[]): void;
    upload(opts: {
        filename: string;
        label?: string;
        allowDuplicates?: boolean;
        category: 'training' | 'testing' | 'split';
    }): Promise<unknown>;
}
