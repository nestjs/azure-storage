export declare function mapObject<T, V>(obj: {
    [k: string]: T;
}, mapper: (k: string, v: T) => V): {
    [k: string]: V;
};
export declare const red: (x: string) => string;
export declare const green: (x: string) => string;
