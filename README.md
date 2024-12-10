# Auth Module

A modular Fastify authentication plugin that provides essential authentication features such as user registration, login, JWT-based sessions, and cookie handling. Built with flexibility and reusability in mind, this module can be integrated into any Fastify project with a few simple configurations.

## Features

- **User Registration & Login**: Routes for creating new users and authenticating existing users.
- **JWT Authentication**: Token-based authentication with customizable secret keys.
- **Cookie Management**: Secure cookies with customizable options for authentication sessions.
- **MySQL Database Support**: Integration with MySQL for user data storage.
- **Error Handling**: Centralized error management for authentication errors.

## Installation

### 1. Local Installation (Development)

Link the module to your Fastify project for local development:

```sh
# In the auth-module directory
npm link

# In your main project directory
npm link auth-module
```
2. Add Dependency to package.json
For a clear record of dependencies, add auth-module to your package.json:
```json
{
  "dependencies": {
    "auth-module": "file:../path/to/auth-module"
  }
}

```
## dependencies 

- fastify: Fastify framework (v5 recommended).
- @fastify/jwt: JSON Web Token support for session management.
- @fastify/cookie: Cookie support for secure storage of JWT tokens.
- @fastify/mysql: MySQL database support for user data.


```ts 
import Fastify from 'fastify';
import authPlugin from 'auth-module';

const server = Fastify();

server.register(authPlugin, {
  routePrefix: '/auth',
  databasePool: { host: 'localhost', user: 'root', database: 'mydb' },
  tokensOptions:{
    accessTokenSecret:process.env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret:process.env.REFRESH_TOKEN_SECRET,
    accessTokenExpires:15*60,//15 minutes
    refreshTokenExpires:7*24*60 //7days
  }
  cookieOptions: {
    secret: process.env.COOKIE_SECRET,
  }
});

server.listen({ port: 3000 }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});

```

## Routes Provided by auth-module
The plugin registers the following routes under the configured routePrefix (default is /auth):
- `POST /auth/register`: Registers a new user with a username and password.
    ###  Request body
    ```json
    {
    "username": "string",
    "email": "string",
    "password": "string"
    }
    ```
    ### Response:
    `201 Created` on success
    `400 Bad Request` for validation errors

- `POST /auth/login`: Authenticates a user and issues a JWT token stored in a cookie.
    ### Request body 
        ```json
        {
        "username": "string",
        "password": "string"
        }
        ```
    ### Response:
    `200 OK` with a JWT token on success
    `401 Unauthorized` if authentication fails

## Plugin options

| Option                  | Type                     | Description                                                 |
|-------------------------|--------------------------|-------------------------------------------------------------|
| `routePrefix`           | `string`                 | Prefix for all auth-related routes. Default is `/auth`.     
| `databasePool`| `FastifyMySQLOptions`    | Configuration for MySQL database connection. Required.      |
| `tokensOptions`         | `TokensOptions`          | Options for configuring tokens. Required.           |
| `cookieOptions`         | `CookieOptions`          | Options for configuring secure cookies. Required.           |
### TokensOptions
| Option                  | Type                     | Description                                                 |
|-------------------------|--------------------------|-------------------------------------------------------------|
| `accessTokenSecret`           | `string` | secret to generate jwt required    
| `refreshTokenSecret`| `string`| secret to generate refreshToken required
| `accessTokenExpires`| `number`| accessToken expiration time default 15 minutes    
| `refreshTokenExpires`| `number`|  refreshToken expiration time default 7 days.

### CookieOptions
The cookieOptions object allows for customization of secure cookie  see:                           |
https://github.com/fastify/fastify-cookie

### Authentication Decorators
This plugin decorates the Fastify instance with the following:

`fastify.authenticate`: A route-level decorator that verifies user authentication by checking JWT tokens in cookies.
`fastify.mysql`: Provides MySQL query capabilities if not already registered.
## TODO
- [x]   Enhance plugin validation with ajv
- [x]   Add refresh-token route
- [ ]   Implement token-based password reset
- [ ]   Create a static registration page
- [ ]   Add email verification for new user registrations
- [ ]   Implement user roles and permissions
- [ ]   Integrate OAuth2 support


```js
//exemple with cors
import fastifyCors from '@fastify/cors';

app.register(fastifyCors, {
  origin: ['https://yourfrontend.com', 'https://anothertrusted.com'], // Allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  credentials: true, // Allow cookies to be sent with requests
});

//in dev mode
app.register(fastifyCors, {
  origin: ['http://localhost:3000'], // Allow local frontend to access the backend
  credentials: true, // Allow cookies (JWT token)
});
//rate limit 
app.register(fastifyRateLimit, {
  max: 100, // Maximum number of requests within the time window
  timeWindow: '1 minute', // Time window (1 minute)
  cache: 10000, // Number of unique clients to remember
  whitelist: ['127.0.0.1'], // Whitelisted IP addresses (e.g., internal services)
  redis, // Use Redis to store rate limit information across distributed servers
  skipOnError: false, // Block requests if Redis is down
});

app.register(authPlugin, {
  routePrefix: '/auth',
  databasePool: { host: 'localhost', user: 'root', database: 'mydb' },
  tokensOptions:{
    accessTokenSecret:process.env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret:process.env.REFRESH_TOKEN_SECRET,
    accessTokenExpires:15*60,//15 minutes
    refreshTokenExpires:7*24*60 //7days
  }
  cookieOptions: {
    secret: process.env.COOKIE_SECRET,
  }
});

```

> **Warning:** This plugin is currently under development.Do not use yet Features and APIs may change.
