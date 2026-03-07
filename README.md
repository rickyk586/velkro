# Velkro
Module-based Node.js API Framework built on [Koa] (the successor to Express)

The purpose of Velkro is to give you a structure for your API code. It allows you to chunk your code into modules, with each module having a routes definition, and optionally a controller and model. Routes are automatically pulled from modules and added to the http server. Velkro also allows you to easily add middleware across the entire API, per group of routes, or per individual routes. It is mostly unopinionated, leaving the data layer up to you. It does however handle JSON body (using [@koa/bodyparser]), [JSON Web Tokens](#json-web-tokens), CORS (using [@koa/cors]), [AJAX respond object structure](#ajax-response-object), and [internal/external error handling](#error-handling). 
  
## Installation

Velkro requires __node v20.0.0__ or higher for ESM

```
$ npm install velkro --save
```

## Hello Velkro

```js
import Velkro from 'velkro';

const app = new Velkro().on('error', e => console.error(e));
await app.ready;
console.log('API Ready!');
```

## Sample App

Check out [test/sample-app](../master/test/sample-app) for an example app.

## Constructor defaults

```js
new Velkro({
    port: '8080',
    modulesDir: 'modules',
    middlewares: [],            //added to each route
    startHttpServer: true,
    routes: {
        filename: 'routes.js',
        base: ''            //url base
    },
    cors: {
        enabled: true,
        options: {}            //passed through to @koa/cors
    },
    jwt: {
        secret: null
    },
    errors: {
        unknownError: {
            handle: 'unknown-error',
            message: 'An internal error occurred',
            data: null
        }
    }
});
```

## Recommended File Structure

* middleware/
* modules/
  * module1/
    * controller.js
    * model.js
    * routes.js
  * module2/
    * module2a/  (nested module)
      * controller.js
      * model.js
      * routes.js
    * controller.js
    * model.js
    * routes.js
* server.js
    
## Routes

Sample routes.js:

```js
import controller from './controller.js';

import loginRequired from '../../middleware/security/login-required.js';
import canViewSecret from '../../middleware/security/can-view-secret.js';

export default [
    {
        routes: {
            post: {
                'test'(){
                    return 'test';
                },
                'login': controller.login,
                'register': controller.register,
            }
        }
    }, {
        middleware: loginRequired,
        routes: {
            get: {
                'me': controller.getMe,
                'me-secret': {
                    middleware: [canViewSecret],
                    handler: controller.getMeSecret
                }
            },
            post: {
                'me': controller.updateMe
            }
        }
    }
];
```

Assuming this file is in modules/user, this will create these routes:

POST /user/login
POST /user/register
GET /user/me
GET /user/me-secret
POST /user/me

As you can see, middleware can be added for a group of routes, or for one individually.
    
## Controller

Each route in routes.js is linked to a method in the controller. The data returned by the method is the data that's sent back to the user (see [AJAX response object below](#ajax-response-object)). Each method can optionally be async. It's good practice to put validation and filtering in controller methods. Each method is passed the ctx object from [Koa]. Errors can be thrown and they will be caught and handled by the framework (see [Error Handling below](#error-handling)).

Sample controller.js:

```js
import { ExternalError } from 'velkro/lib/errors.js';
import model from './model.js';

export default {
    async login(ctx){
        const data = ctx.request.body;
        
        let userId;
        
        try{
            userId = await model.login(data.email, data.password);
        }catch(e){
            if(e.handle === 'incorrect-password'){
                throw ExternalError('incorrect-password', 'The password you provided is incorrect');
            }

            throw e;
        }
        
        ctx.state.user = {
            id: userId
        };
        
        return userId;
    },
    async getMe(ctx){
        const userId = ctx.state.user.id;
        let user = await model.find(userId);
        
        //filter user
        
        return user;
    },
    //... other methods used in routes.js
};
```

## Model (optional)

You can optionally have a model for each module. It's good practice to put external data-fetching here. It's also good practice to only allow models to call other models (instead of controllers).

Sample model.js:

```js
const mockDB = {
    '123': {
        email: 'foo@foo.com',
        firstname: 'bar',
    }
};

export default {
    async find(userId){
        await new Promise(resolve => setTimeout(resolve, 50));    //simulate asynchronous call
        return mockDB[userId];
    },
    async login(email, password){
        //mock login
        await new Promise(resolve => setTimeout(resolve, 50));    //simulate asynchronous call
        if(email === mockDB[123].email && password === 'bar'){
            return 123;
        }else{
            const error = new Error('incorrect-password');
            error.handle = 'incorrect-password';
            throw error;
        }
    }
};
```

## AJAX Response Object

The data returned by each route is in a standardized object format:

```json
{
    "actions": [],
    "errors": [{
        "msg": "",
        "handle": ""    
    }],
    "notices": [],
    "data": {}
}
```

Data returned by each controller method is put into "data". Errors are added to the "errors" array (see [Error Handling below](#error-handling)). "actions" can be used by the frontend to perform a task as instructed by the backend. You can add an action by calling `ctx.ajax.addAction('the-action')`. "notices" work in a similar way (with `ctx.ajax.addNotice()`). Errors can be added using ctx.ajax.addError(handle, message, data).

## Error Handling

Using Async/Await (promises in general) everywhere allows us to take advantage of having one exception channel. That is, if an error occurs, an exception is thrown and it flows back up through the call stack where it can be caught anywhere along the way using try/catch.

_(Please see the 'test-error' route in [test/sample-app/modules/routes.js](../master/test/sample-app/modules/routes.js) to follow an example of error handling)_

Velkro offers a specialized Error to assist with error handling:

### ExternalError

`import { ExternalError } from 'velkro/lib/errors.js';`

This is to be used when an error is meant to be displayed to the user. To continue the example above, the Error can be caught and converted to an ExternalError like so:

```js
export default {
    async testError(ctx){
        try{
            await model.testError();
        }catch(e){
            if(e.handle === 'incorrect-password'){
                throw new ExternalError('incorrect-password', 'The password you provided is incorrect');
            }else{
                throw e;
            }
        }
        
        return 'no error';
    }
};
```

---

If an error makes its way all the way back up (for example, if `throw e` above ran because e.handle did not match), then it is added to the AJAX object errors array with the handle 'unknown-error' and the message "An internal error occurred" (these can be configured in the constructor). ExternalErrors are added to the AJAX object errors array with the same handle and message that they were constructed with, so that they can be handled by the frontend accordingly.

## JSON Web Tokens

If `jwt.secret` is set in the Velkro constructor, then JWT functionality is added. All you have to do is set `ctx.state.user` to the data that you want in the token. This will set a `session` cookie with the JWT. The cookie is set with `HttpOnly`, `SameSite: 'strict'`, and `Secure: ctx.secure` attributes. The JWT is then automatically extracted from this cookie on subsequent requests and placed into `ctx.state.user`, which for example can be used for determining if a user is logged in or not (see [test/sample-app/middleware/security/login-required.js](../master/test/sample-app/middleware/security/login-required.js)).

_([koa-jwt] is used for upstream token validation/parsing, and [jsonwebtoken] is used for downstream token signing)_

## app

The app instance returned from `new Velkro()` is an event emitter that emits these events:
* 'middleware-added'        //called when all the core middleware has been added
* 'routes-loaded'            //called when all routes have been loaded 
* 'http-server-started'        //called when the server has started
* 'external-error'            //called on each external error (see Error Handling)
* 'unknown-error'             //called on any other error (not an ExternalError)
* 'err'                        //called on any error (any of above)

The event is emitted with the [Koa] app as the first parameter. The 'routes-loaded' event is emitted with a second parameter of an object showing all of the routes like so:

```json
{
    "/user": [
        "POST login",
        "GET me"
    ],
    "": [
        "GET ",
        "GET xyz"
    ]
}
```

`app.ready` is a promise that resolves with the [Koa] app when the Velkro app is completely loaded.

[Koa]: http://koajs.com/
[@koa/bodyparser]: https://github.com/koajs/bodyparser
[@koa/cors]: https://github.com/koajs/cors
[@koa/router]: https://github.com/koajs/router
[koa-jwt]: https://github.com/koajs/jwt
[jsonwebtoken]: https://github.com/auth0/node-jsonwebtoken
