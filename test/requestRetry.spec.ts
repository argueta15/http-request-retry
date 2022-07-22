import * as requestRetry from '../index';
import { Cache } from '../lib/Cache';
import * as assert from 'assert';
import * as nock from 'nock';
import axios from 'axios';
import * as sinon from 'sinon';
import 'mocha';
import { BAD_REQUEST, SERVICE_UNAVAILABLE, OK } from 'http-status';

const URL_OK = 'http://www.allok.com';
const URL_4XX = 'http://www.error4xx.com';
const URL_5XX = 'http://www.error5xx.com';

const OK_RESPONSE = { succes: 'ok' };
const ERROR_RESPONSE = { error: { message: 'error' } };

describe('Resource test cases', () => {
  const sandbox = sinon.createSandbox();
  const Redis = new Cache();

  let axiosDescriptor: sinon.SinonSpy;

  before(() => {
    nock.disableNetConnect();
    const nockConf = {
      reqheaders: {
        'X-Application-ID': 'x_application_id'
      }
    };

    nock(URL_5XX, nockConf).persist().get('/').reply(SERVICE_UNAVAILABLE, ERROR_RESPONSE);
    nock(URL_4XX, nockConf).persist().get('/').reply(BAD_REQUEST, ERROR_RESPONSE);
  });
  
  beforeEach(async () => {
    axiosDescriptor = sandbox.spy(axios, 'request');
    await Redis.redis.flushdb();
  });

  afterEach(() => sandbox.restore());

  it('OK request', async () => {
    const body = { test: 'test' };
    const scope = nock(URL_OK).post('/', body).reply(OK, OK_RESPONSE);
    const result = await requestRetry['post']({ url: URL_OK, data: body });
    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('OK GET request query params', async () => {
    const params = { test: 'test' };
    const scope = nock(URL_OK).get('/?test=test').reply(OK, OK_RESPONSE);
    const result = await requestRetry['get']({ url: URL_OK, params });

    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('OK request delete', async () => {
    const scope = nock(URL_OK).delete('/').reply(OK, OK_RESPONSE);
    const result = await requestRetry['delete']({ url: URL_OK, data: {} });
    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('OK request patch and custom headers', async () => {
    const headers = { 'x-test': 'test', 'Content-Type': 'text/plain' };
    const scope = nock(URL_OK, {
      reqheaders: { ...headers, 'x-application-id': 'x_application_id', },
    }).patch('/', body => !!body).reply(OK, OK_RESPONSE);

    const result = await requestRetry['patch']({ url: URL_OK, data: {}, headers });
    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('OK POST request after retries', async () => {
    const scope = nock(URL_OK, {
      reqheaders: {
        'Content-Type': 'application/json',
      }
    }).post('/', body => !!body).reply(SERVICE_UNAVAILABLE, OK_RESPONSE)
      .post('/', body => !!body).reply(SERVICE_UNAVAILABLE, OK_RESPONSE)
      .post('/', body => !!body).reply(OK, OK_RESPONSE);

    const result = await requestRetry['post']({ url: URL_OK, data: {}, maxRetry: 2 });
    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('Fail 5XX no retries request', async () => { 
    await requestRetry['get']({ url: URL_5XX })
      .catch((error) => {
        assert.equal(error.response.status, SERVICE_UNAVAILABLE);
        assert.deepEqual(error.response.data, ERROR_RESPONSE);
      });
    assert(axiosDescriptor.calledOnce);
  });

  it('Fail 5XX retries request', async () => {
    await requestRetry['get']({ url: URL_5XX, maxRetry: 2 })
      .catch((error) => {
        assert.equal(error.response.status, SERVICE_UNAVAILABLE);
        assert.deepEqual(error.response.data, ERROR_RESPONSE);
      });
    assert(axiosDescriptor.calledThrice);
  });

  it('Get a 5XX and use single fallback response', async () => {
    const fallbackResponse = { message: 'the request has failed' };
    const result = await requestRetry['get']({ url: URL_5XX, fallbackResponse });
    assert(axiosDescriptor.calledOnce);
    assert.deepEqual(result, fallbackResponse);
  });

  it('Get 5XX and use resolver fallback response', async () => {
    const scope = nock(URL_OK).post('/', body => !!body).reply(OK, OK_RESPONSE);
    const fallbackResponse = () => requestRetry['post']({ url: URL_OK, data: {} });

    const result = await requestRetry['get']({ url: URL_5XX, fallbackResponse });

    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('Fail 4XX retries request', async () => {
    await requestRetry['get']({ url: URL_4XX, maxRetry: 2 })
      .then(assert.fail)
      .catch((error) => {
        assert.equal(error.response.status, BAD_REQUEST);
        assert.deepEqual(error.response.data, ERROR_RESPONSE);
      });;
    assert(axiosDescriptor.calledOnce);
  });

  it('Fail 4XX retries request delete auth headers', async () => {
    const headers = { 'Authorization': 'authorization', 'x-api-key': 'x-api-key' };
    await requestRetry['get']({ url: URL_4XX, headers })
      .then(assert.fail)
      .catch((error) => {
        assert.equal(error.config.headers.Authorization, 'xxxxxxxxxxxxx');
        assert.equal(error.config.headers['x-api-key'], 'xxxxxxxxxxxxx');
        assert.equal(error.response.status, BAD_REQUEST);
        assert.deepEqual(error.response.data, ERROR_RESPONSE);
      });;
    assert(axiosDescriptor.calledOnce);
  });

  it('OK request cached', async () => {
    const scope = nock(URL_OK).put('/', body => !!body).reply(OK, OK_RESPONSE);

    await requestRetry['put']({ url: URL_OK, data: {}, cache: 60 });
    const result = await requestRetry['put']({ url: URL_OK, data: {}, cache: 60 });

    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('Return fallback response by bad configuration', async () => {
    const body = { test: 'test' };
    const fallbackResponse = () => OK_RESPONSE;
    const result = await requestRetry['get']({ url: 'http://localhost', fallbackResponse });
    assert.deepEqual(result, OK_RESPONSE);
  });

  it('OK Deleting undefined headers', async () => {
    const headers = { 'x-test': 'test', 'Content-Type': 'text/plain', country: undefined };
    const scope = nock(URL_OK, {
      reqheaders: { 'x-test': 'test', 'Content-Type': 'text/plain', 'x-application-id': 'x_application_id', },
    }).patch('/', body => !!body).reply(OK, OK_RESPONSE);

    const result = await requestRetry['patch']({ url: URL_OK, data: {}, headers });
    assert(scope.isDone());
    assert.deepEqual(result, OK_RESPONSE);
  });
});
