/// <reference types="node" />
import * as ioredis from 'ioredis';
import { ConnectionOptions } from 'tls';
export declare class RedisConfig implements ioredis.RedisOptions {
    host?: string | undefined;
    family?: number | undefined;
    path?: string | undefined;
    keepAlive?: number | undefined;
    connectionName?: string | undefined;
    password?: string | undefined;
    enableReadyCheck?: boolean | undefined;
    keyPrefix?: string | undefined;
    maxRetriesPerRequest?: number | null | undefined;
    enableOfflineQueue?: boolean | undefined;
    connectTimeout?: number | undefined;
    autoResubscribe?: boolean | undefined;
    autoResendUnfulfilledCommands?: boolean | undefined;
    lazyConnect?: boolean | undefined;
    tls?: ConnectionOptions | undefined;
    sentinels?: {
        host: string;
        port: number;
    }[] | undefined;
    name?: string | undefined;
    readOnly?: boolean | undefined;
    dropBufferSupport?: boolean | undefined;
    showFriendlyErrorStack?: boolean | undefined;
    db: number;
    constructor(host: string, port: number);
}
