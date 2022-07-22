"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const ioredis_1 = require("ioredis");
const cache = require("memory-cache");
const RedisConfig_1 = require("../entities/RedisConfig");
const logger = console.log.bind(console, 'cache-request-retry:');
let globalRedis = null;
class Cache {
    constructor() {
        this.preKey = "http-request-retry";
        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = process.env.REDIS_PORT || 6379;
        if (redisHost && redisPort) {
            const configuration = new RedisConfig_1.RedisConfig(redisHost, Number(redisPort));
            if (globalRedis) {
                this.redis = globalRedis;
            }
            else {
                this.redis = new ioredis_1.default(configuration);
                globalRedis = this.redis;
            }
        }
    }
    cache(key, time, callback, ...params) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedData = yield this.get(key);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            const data = yield callback(...params);
            yield this.set(key, JSON.stringify(data), time);
            return data;
        });
    }
    set(key, data, expiration) {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                if (this.redis && this.redis.status === 'ready') {
                    response = this.redis.set(`${this.preKey}-${key}`, data, 'EX', expiration);
                }
                else {
                    throw new Error('Redis is not ready');
                }
            }
            catch (ex) {
                response = cache.put(`${this.preKey}-${key}`, data, expiration * 1000);
                logger(`set cache fallback - ex ${ex}`);
            }
            return response;
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                if (this.redis && this.redis.status === 'ready') {
                    response = this.redis.get(`${this.preKey}-${key}`);
                }
                else {
                    throw new Error('Redis is not ready');
                }
            }
            catch (ex) {
                response = cache.get(`${this.preKey}-${key}`);
                logger(`get cache fallback - ex ${ex}`);
            }
            return response;
        });
    }
}
exports.Cache = Cache;
//# sourceMappingURL=Cache.js.map