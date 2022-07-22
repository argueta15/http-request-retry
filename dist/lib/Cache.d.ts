export declare class Cache {
    redis: any;
    private readonly preKey;
    constructor();
    cache(key: any, time: any, callback: any, ...params: any[]): Promise<any>;
    set(key: string, data: string, expiration: number): Promise<any>;
    get(key: string): Promise<any>;
}
