import ioredis from 'ioredis';
import * as cache from 'memory-cache';
import { RedisConfig } from '../entities/RedisConfig';
const logger = console.log.bind(console, 'cache-request-retry:')

let globalRedis = null;

export class Cache {
    public redis: any;
    private readonly preKey = "http-request-retry";
    constructor() {
        const redisHost = process.env.REDIS_HOST || 'localhost'
        const redisPort = process.env.REDIS_PORT || 6379
        if (redisHost && redisPort) {
            const configuration = new RedisConfig(redisHost, Number(redisPort))
            if (globalRedis){
                this.redis = globalRedis
            }else{
                this.redis = new ioredis(configuration)
                globalRedis = this.redis
            }
        }
    }

    async cache(key, time, callback, ...params) {
        const cachedData = await this.get(key)
    
        if (cachedData) {
          return JSON.parse(cachedData)
        }
    
        const data = await callback(...params)
    
        await this.set(key, JSON.stringify(data), time)
    
        return data
      }

    async set(key: string, data: string, expiration: number):Promise<any> {
        let response
        try {
            if (this.redis && this.redis.status === 'ready') {
                response = this.redis.set(`${this.preKey}-${key}`, data, 'EX', expiration);
            } else {
                throw new Error('Redis is not ready');
            }
        } catch (ex) {
            response = cache.put(`${this.preKey}-${key}`, data, expiration * 1000);
            logger(`set cache fallback - ex ${ex}`);
        }
        return response
    }

    async get(key: string):Promise<any> {
        let response
        try {
            if (this.redis && this.redis.status === 'ready') {
                response =  this.redis.get(`${this.preKey}-${key}`);
            } else {
                throw new Error('Redis is not ready');
            }
        } catch (ex) {
            response = cache.get(`${this.preKey}-${key}`);
            logger(`get cache fallback - ex ${ex}`);
        }
        return response
    }
}
