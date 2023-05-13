export declare type SpawnHelperType = (command: string, args: string[], opts?: {
    ignoreErrors: boolean;
    cwd?: string;
}) => Promise<string>;
export declare function spawnHelper(command: string, args: string[], opts?: {
    ignoreErrors: boolean;
    cwd?: string;
}): Promise<string>;
