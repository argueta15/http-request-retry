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
const requestRetry = require("../index");
const Cache_1 = require("../lib/Cache");
const assert = require("assert");
const nock = require("nock");
const axios_1 = require("axios");
const sinon = require("sinon");
require("mocha");
const http_status_1 = require("http-status");
const URL_OK = 'http://www.allok.com';
const URL_4XX = 'http://www.error4xx.com';
const URL_5XX = 'http://www.error5xx.com';
const OK_RESPONSE = { succes: 'ok' };
const ERROR_RESPONSE = { error: { message: 'error' } };
describe('Resource test cases', () => {
    const sandbox = sinon.createSandbox();
    const Redis = new Cache_1.Cache();
    let axiosDescriptor;
    before(() => {
        nock.disableNetConnect();
        const nockConf = {
            reqheaders: {
                'X-Application-ID': 'x_application_id'
            }
        };
        nock(URL_5XX, nockConf).persist().get('/').reply(http_status_1.SERVICE_UNAVAILABLE, ERROR_RESPONSE);
        nock(URL_4XX, nockConf).persist().get('/').reply(http_status_1.BAD_REQUEST, ERROR_RESPONSE);
    });
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        axiosDescriptor = sandbox.spy(axios_1.default, 'request');
        yield Redis.redis.flushdb();
    }));
    afterEach(() => sandbox.restore());
    it('OK request', () => __awaiter(void 0, void 0, void 0, function* () {
        const body = { test: 'test' };
        const scope = nock(URL_OK).post('/', body).reply(http_status_1.OK, OK_RESPONSE);
        const result = yield requestRetry['post']({ url: URL_OK, data: body });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('OK GET request query params', () => __awaiter(void 0, void 0, void 0, function* () {
        const params = { test: 'test' };
        const scope = nock(URL_OK).get('/?test=test').reply(http_status_1.OK, OK_RESPONSE);
        const result = yield requestRetry['get']({ url: URL_OK, params });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('OK request delete', () => __awaiter(void 0, void 0, void 0, function* () {
        const scope = nock(URL_OK).delete('/').reply(http_status_1.OK, OK_RESPONSE);
        const result = yield requestRetry['delete']({ url: URL_OK, data: {} });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('OK request patch and custom headers', () => __awaiter(void 0, void 0, void 0, function* () {
        const headers = { 'x-test': 'test', 'Content-Type': 'text/plain' };
        const scope = nock(URL_OK, {
            reqheaders: Object.assign(Object.assign({}, headers), { 'x-application-id': 'x_application_id' }),
        }).patch('/', body => !!body).reply(http_status_1.OK, OK_RESPONSE);
        const result = yield requestRetry['patch']({ url: URL_OK, data: {}, headers });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('OK POST request after retries', () => __awaiter(void 0, void 0, void 0, function* () {
        const scope = nock(URL_OK, {
            reqheaders: {
                'Content-Type': 'application/json',
            }
        }).post('/', body => !!body).reply(http_status_1.SERVICE_UNAVAILABLE, OK_RESPONSE)
            .post('/', body => !!body).reply(http_status_1.SERVICE_UNAVAILABLE, OK_RESPONSE)
            .post('/', body => !!body).reply(http_status_1.OK, OK_RESPONSE);
        const result = yield requestRetry['post']({ url: URL_OK, data: {}, maxRetry: 2 });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('Fail 5XX no retries request', () => __awaiter(void 0, void 0, void 0, function* () {
        yield requestRetry['get']({ url: URL_5XX })
            .catch((error) => {
            assert.equal(error.response.status, http_status_1.SERVICE_UNAVAILABLE);
            assert.deepEqual(error.response.data, ERROR_RESPONSE);
        });
        assert(axiosDescriptor.calledOnce);
    }));
    it('Fail 5XX retries request', () => __awaiter(void 0, void 0, void 0, function* () {
        yield requestRetry['get']({ url: URL_5XX, maxRetry: 2 })
            .catch((error) => {
            assert.equal(error.response.status, http_status_1.SERVICE_UNAVAILABLE);
            assert.deepEqual(error.response.data, ERROR_RESPONSE);
        });
        assert(axiosDescriptor.calledThrice);
    }));
    it('Get a 5XX and use single fallback response', () => __awaiter(void 0, void 0, void 0, function* () {
        const fallbackResponse = { message: 'the request has failed' };
        const result = yield requestRetry['get']({ url: URL_5XX, fallbackResponse });
        assert(axiosDescriptor.calledOnce);
        assert.deepEqual(result, fallbackResponse);
    }));
    it('Get 5XX and use resolver fallback response', () => __awaiter(void 0, void 0, void 0, function* () {
        const scope = nock(URL_OK).post('/', body => !!body).reply(http_status_1.OK, OK_RESPONSE);
        const fallbackResponse = () => requestRetry['post']({ url: URL_OK, data: {} });
        const result = yield requestRetry['get']({ url: URL_5XX, fallbackResponse });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('Fail 4XX retries request', () => __awaiter(void 0, void 0, void 0, function* () {
        yield requestRetry['get']({ url: URL_4XX, maxRetry: 2 })
            .then(assert.fail)
            .catch((error) => {
            assert.equal(error.response.status, http_status_1.BAD_REQUEST);
            assert.deepEqual(error.response.data, ERROR_RESPONSE);
        });
        ;
        assert(axiosDescriptor.calledOnce);
    }));
    it('Fail 4XX retries request delete auth headers', () => __awaiter(void 0, void 0, void 0, function* () {
        const headers = { 'Authorization': 'authorization', 'x-api-key': 'x-api-key' };
        yield requestRetry['get']({ url: URL_4XX, headers })
            .then(assert.fail)
            .catch((error) => {
            assert.equal(error.config.headers.Authorization, 'xxxxxxxxxxxxx');
            assert.equal(error.config.headers['x-api-key'], 'xxxxxxxxxxxxx');
            assert.equal(error.response.status, http_status_1.BAD_REQUEST);
            assert.deepEqual(error.response.data, ERROR_RESPONSE);
        });
        ;
        assert(axiosDescriptor.calledOnce);
    }));
    it('OK request cached', () => __awaiter(void 0, void 0, void 0, function* () {
        const scope = nock(URL_OK).put('/', body => !!body).reply(http_status_1.OK, OK_RESPONSE);
        yield requestRetry['put']({ url: URL_OK, data: {}, cache: 60 });
        const result = yield requestRetry['put']({ url: URL_OK, data: {}, cache: 60 });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('Return fallback response by bad configuration', () => __awaiter(void 0, void 0, void 0, function* () {
        const body = { test: 'test' };
        const fallbackResponse = () => OK_RESPONSE;
        const result = yield requestRetry['get']({ url: 'http://localhost', fallbackResponse });
        assert.deepEqual(result, OK_RESPONSE);
    }));
    it('OK Deleting undefined headers', () => __awaiter(void 0, void 0, void 0, function* () {
        const headers = { 'x-test': 'test', 'Content-Type': 'text/plain', country: undefined };
        const scope = nock(URL_OK, {
            reqheaders: { 'x-test': 'test', 'Content-Type': 'text/plain', 'x-application-id': 'x_application_id', },
        }).patch('/', body => !!body).reply(http_status_1.OK, OK_RESPONSE);
        const result = yield requestRetry['patch']({ url: URL_OK, data: {}, headers });
        assert(scope.isDone());
        assert.deepEqual(result, OK_RESPONSE);
    }));
});
//# sourceMappingURL=requestRetry.spec.js.map