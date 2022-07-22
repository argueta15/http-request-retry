# Request Retry

Request retry is the axios interface implementing 3 new parameters [fallbackResponse, cache, maxRetry].


- ### fallbackResponse

In case the request fails, it returns the object stored in the fallbackResponse parameter:
```js
import * as rp from 'request-retry';

const options = {
  url: `${Env.get('API_URL')}`,
  headers: { 'Content-Type': 'application/json' },
  fallbackResponse: []
}

return rp.get(options) //in case it fails the object is returned []
```

Or also, if the request fails, execute a function that will receive the error and the options used to make the request as the only parameter.
```js
import * as rp from 'request-retry';

const options = {
  url: `${Env.get('API_URL')}`,
  headers: { 'Content-Type': 'application/json' },
  fallbackResponse: (e, data) => e.response.status === 400 ? [] : ['fake'],
}

return rp.get(options) //in case it fails, the function passed by parameter will be executed
```

- ### cache

Cache the service response in case the http code is 200:
```sh
import * as rp from 'request-retry';

const options = {
  url: `${Env.get('API_URL')}`,
  headers: { 'Content-Type': 'application/json' },
  cache: 1
}

return rp.get(options) 
```
- ### maxRetry

If the error code is 504 or 503, the request is retried the configured number of times:
```sh
import * as rp from 'request-retry';

const options = {
  url: `${Env.get('API_URL')}`,
  headers: { 'Content-Type': 'application/json' },
  maxRetry: 3
}

return rp.get(options) 
```