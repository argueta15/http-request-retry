import axios from 'axios';
import * as rax from 'retry-axios';
import { GATEWAY_TIMEOUT, BAD_GATEWAY } from 'http-status';
import { Cache } from './lib/Cache';
import { sha256 } from 'js-sha256';

let f: { (options: any): any; get: any; post: any; put: any; delete: any; patch: any; };

const authHeaders: Array<string> = ['authorization', 'x-api-key']

const CONTENT_TYPE_HEADER = { 'Content-Type': 'application/json' };

const cache = new Cache();
rax.attach();
const logger = console.log.bind(console, 'http-request-retry:');

axios.defaults.headers.common['X-Application-ID'] = process.env['x_application_id'] || 'x_application_id';
Object.assign(axios.defaults.headers.common, CONTENT_TYPE_HEADER);

const raxConfig = {
    httpMethodsToRetry: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE'],
    backoffType: 'static',
    statusCodesToRetry: [[BAD_GATEWAY, GATEWAY_TIMEOUT]],
};

axios.interceptors.request.use((options) => {
    if (options.headers && !options.headers['Content-Type']) Object.assign(options.headers, CONTENT_TYPE_HEADER);

    return options;
});

function request(options: any) {
    return axios(options).then(({ data }) => data);
}

function getKey(options: any) {
    const key = JSON.stringify(options);
    return sha256(key);
}

function retry(method: string, data: any, iteration = 0): Promise<any> {
    const { maxRetry = 0, fallbackResponse } = data;

    const payload = sanitizePayload(data)

    return axios.request({ ...payload, method, raxConfig: { ...raxConfig, retry: Number(maxRetry) } }).then(({ data }) => data).catch((e: any) => {

        const fixedError = deleteErrorAuthHeaders(e)

        let logData = data
        if(logData.headers){
            logData = JSON.parse(JSON.stringify(data))
            hashHeaders(logData.headers)
        }

        logger(`Failed by max retries ${maxRetry} reached ${JSON.stringify(logData)} or error ${JSON.stringify(fixedError)}`);
        if (fallbackResponse) {
            logger(`Returning fallback response: ${JSON.stringify(fallbackResponse)} uri: ${logData.url} `);
            return typeof fallbackResponse === 'function' ? fallbackResponse(e, data) : fallbackResponse;
        }

        throw fixedError;
    });
}

function hashHeaders(headers){
    Object.keys(headers).forEach(key => {
        if (authHeaders.includes(key.toLowerCase())) {
            headers[key] = 'xxxxxxxxxxxxx'
        }
    })
}

function deleteErrorAuthHeaders(e: any){

    const objects = ['request', 'config']

    objects.forEach(obj => {
        if (e[obj] && e[obj].headers) {
            hashHeaders(e[obj].headers)
        }
    })

    return e
}

function retryCached(method, options) {
    const { cache: cacheSeconds } = options;

    return cacheSeconds ? cache.cache(getKey(options), cacheSeconds, retry.bind(retry), method, options) : retry(method, options);
}

function sanitizePayload(payload){
    if (payload.timeout) payload.timeout = Number(payload.timeout)
    if (payload.uri && !payload.url) payload.url = String(payload.uri)
    if (payload.body && !payload.data) payload.data = payload.body
    if (payload.qs && !payload.params) payload.params = payload.qs

    if (payload.headers && Object.keys(payload.headers).length){
        Object.keys(payload.headers).forEach(key => {
            if (payload.headers[key] === undefined){
                delete payload.headers[key]
            }

        })
    }

    return payload
}

f = (() => {
    const _f: any = request;
    _f.get = (options: any) => retryCached('get', options);
    _f.post = (options: any) => retryCached('post', options)
    _f.put = (options: any) => retryCached('put', options)
    _f.delete = (options: any) => retryCached('delete', options)
    _f.patch = (options) => retryCached('patch', options)
    return _f;
})();

export = f;
