"use strict";
const axios_1 = require("axios");
const rax = require("retry-axios");
const http_status_1 = require("http-status");
const Cache_1 = require("./lib/Cache");
const js_sha256_1 = require("js-sha256");
let f;
const authHeaders = ['authorization', 'x-api-key'];
const CONTENT_TYPE_HEADER = { 'Content-Type': 'application/json' };
const cache = new Cache_1.Cache();
rax.attach();
const logger = console.log.bind(console, 'http-request-retry:');
axios_1.default.defaults.headers.common['X-Application-ID'] = process.env['x_application_id'] || 'x_application_id';
Object.assign(axios_1.default.defaults.headers.common, CONTENT_TYPE_HEADER);
const raxConfig = {
    httpMethodsToRetry: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE'],
    backoffType: 'static',
    statusCodesToRetry: [[http_status_1.BAD_GATEWAY, http_status_1.GATEWAY_TIMEOUT]],
};
axios_1.default.interceptors.request.use((options) => {
    if (options.headers && !options.headers['Content-Type'])
        Object.assign(options.headers, CONTENT_TYPE_HEADER);
    return options;
});
function request(options) {
    return (0, axios_1.default)(options).then(({ data }) => data);
}
function getKey(options) {
    const key = JSON.stringify(options);
    return (0, js_sha256_1.sha256)(key);
}
function retry(method, data, iteration = 0) {
    const { maxRetry = 0, fallbackResponse } = data;
    const payload = sanitizePayload(data);
    return axios_1.default.request(Object.assign(Object.assign({}, payload), { method, raxConfig: Object.assign(Object.assign({}, raxConfig), { retry: Number(maxRetry) }) })).then(({ data }) => data).catch((e) => {
        const fixedError = deleteErrorAuthHeaders(e);
        let logData = data;
        if (logData.headers) {
            logData = JSON.parse(JSON.stringify(data));
            hashHeaders(logData.headers);
        }
        logger(`Failed by max retries ${maxRetry} reached ${JSON.stringify(logData)} or error ${JSON.stringify(fixedError)}`);
        if (fallbackResponse) {
            logger(`Returning fallback response: ${JSON.stringify(fallbackResponse)} uri: ${logData.url} `);
            return typeof fallbackResponse === 'function' ? fallbackResponse(e, data) : fallbackResponse;
        }
        throw fixedError;
    });
}
function hashHeaders(headers) {
    Object.keys(headers).forEach(key => {
        if (authHeaders.includes(key.toLowerCase())) {
            headers[key] = 'xxxxxxxxxxxxx';
        }
    });
}
function deleteErrorAuthHeaders(e) {
    const objects = ['request', 'config'];
    objects.forEach(obj => {
        if (e[obj] && e[obj].headers) {
            hashHeaders(e[obj].headers);
        }
    });
    return e;
}
function retryCached(method, options) {
    const { cache: cacheSeconds } = options;
    return cacheSeconds ? cache.cache(getKey(options), cacheSeconds, retry.bind(retry), method, options) : retry(method, options);
}
function sanitizePayload(payload) {
    if (payload.timeout)
        payload.timeout = Number(payload.timeout);
    if (payload.uri && !payload.url)
        payload.url = String(payload.uri);
    if (payload.body && !payload.data)
        payload.data = payload.body;
    if (payload.qs && !payload.params)
        payload.params = payload.qs;
    if (payload.headers && Object.keys(payload.headers).length) {
        Object.keys(payload.headers).forEach(key => {
            if (payload.headers[key] === undefined) {
                delete payload.headers[key];
            }
        });
    }
    return payload;
}
f = (() => {
    const _f = request;
    _f.get = (options) => retryCached('get', options);
    _f.post = (options) => retryCached('post', options);
    _f.put = (options) => retryCached('put', options);
    _f.delete = (options) => retryCached('delete', options);
    _f.patch = (options) => retryCached('patch', options);
    return _f;
})();
module.exports = f;
//# sourceMappingURL=index.js.map