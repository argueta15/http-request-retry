"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisConfig = void 0;
class RedisConfig {
    constructor(host, port) {
        this.db = 0;
        Object.assign(this, { host, port,
            retryStrategy(times) {
                return 60000;
            }
        });
    }
}
exports.RedisConfig = RedisConfig;
//# sourceMappingURL=RedisConfig.js.map