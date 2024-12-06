import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import authentication from './index.js';
import { FastifyMySQLOptions } from '@fastify/mysql';
import { truncateUsersTable } from './utils/test-utils.js';

describe('Auth plugin routes test suite with cookie', async () => {
    let pool: FastifyMySQLOptions = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    let accessToken: string;
    let refreshToken: string;

    const invalidEmail = 'test@io@epam.com';

    const invalidEmailMessage = 'body/email must match format "email"';
    const tooShortPasswordMessage = 'body/password must NOT have fewer than 9 characters';

    const user = {
        email: 'userTest@example.com',
        username: 'userTest',
        password: 'password123'
    }

    let app = fastify();

    app.register(fastifyCors, {
        origin: ['http://localhost:8000'], // Allowed origins
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
        credentials: true, // Allow cookies to be sent with requests
    });
    app.register(fastifyRateLimit, {
        max: 100,
        timeWindow: '1 minute'
    });

    await app.register(authentication, {
        routePrefix: 'api/auth',
        databasePool: pool,
        tokens:{
            accessTokenSecret:'some-secret',
            accessTokenExpires:60
        }
    });

    app.get('/secret', { preHandler: app.authenticate }, (request, reply) => {
        return { message: 'shhh its a secret' };
    });

    before(async () => {
        await truncateUsersTable();
    });

    after(async () => app.close());

    it('GET / should respond 200 when setting option.routePrefix ', async (t) => {
        const response = await app.inject({
            url: 'api/auth/up',
            method: 'GET'
        });
        assert.equal(response.statusCode, 200);
    });


    it('POST /register should register', async (t) => {
        const response = await app.inject({
            url: 'api/auth/register',
            method: 'POST',
            body: user
        });
        assert.equal(response.statusCode, 201);
    });

    it('POST /register should return 400 when register if email already exist', async (t) => {
        const response = await app.inject({
            url: 'api/auth/register',
            method: 'POST',
            body: {
                email: user.email,
                username: 'userTest',
                password: 'password123'

            }
        });
        assert.equal(response.statusCode, 400);
        assert.deepStrictEqual(response.json(), { success: false, error: 'email is already taken' })
    });

    it('POST /register should return 400 when register if password is too short', async (t) => {
        const response = await app.inject({
            url: 'api/auth/register',
            method: 'POST',
            body: {
                email: 'anotherTest@example.com',
                username: 'userTest',
                password: 'passwo'

            }
        });
        assert.equal(response.statusCode, 400);
        assert.deepStrictEqual(response.json(), { success: false, error: tooShortPasswordMessage });
    });

    it('POST /register should return 400 when register if invalid email', async (t) => {
        const response = await app.inject({
            url: 'api/auth/register',
            method: 'POST',
            body: {
                email: invalidEmail,
                username: 'userTest',
                password: 'password123'

            }
        });
        assert.equal(response.statusCode, 400);
        assert.deepStrictEqual(response.json(), { success: false, error: invalidEmailMessage });
    });

    it('POST /login should return 401 when invalid credentials', async (t) => {
        const response = await app.inject({
            url: 'api/auth/login',
            method: 'POST',
            body: {
                email: 'someemail@example.com',
                password: 'anypasswordnjdu'
            }
        });
        assert.equal(response.statusCode, 401);
        assert.deepStrictEqual(response.json(), { success: false, error: 'Invalid credentials' })
    });

    it('POST /login should return 400 validation error if empty body', async (t) => {
        const response = await app.inject({
            url: 'api/auth/login',
            method: 'POST',
            body: {}
        });
        assert.equal(response.statusCode, 400);
        assert.deepStrictEqual(response.json(), { success: false, error: "body must have required property 'email'" });
    });
    //https://github.com/ajv-validator/ajv-formats
    it('POST /login should return 400 validation error if password less than 9 characters', async (t) => {
        const response = await app.inject({
            url: 'api/auth/login',
            method: 'POST',
            body: {
                email: 'some@email.net',
                password: '123fduyt'
            }
        });
        assert.equal(response.statusCode, 400);
        assert.deepStrictEqual(response.json(), { success: false, error: tooShortPasswordMessage });
    });
    it('POST /login should return 400 validation error if email is invalid', async (t) => {
        const response = await app.inject({
            url: 'api/auth/login',
            method: 'POST',
            body: {
                email: invalidEmail,
                password: '123fduytfrtgh'
            }
        });
        assert.equal(response.statusCode, 400);
        assert.deepStrictEqual(response.json(), { success: false, error: invalidEmailMessage });
    });

    it('POST /login should login and set the right cookies', async (t) => {
        const response = await app.inject({
            url: 'api/auth/login',
            method: 'POST',
            body: {
                email: user.email,
                password: user.password
            }
        });
        accessToken = response.cookies[0].value;
        refreshToken = response.cookies[1].value;
        assert.equal(response.statusCode, 200);
        assert.deepStrictEqual(response.json(), { success: true, message: 'Login successful' });
        assert.equal(response.cookies.length, 2);
        assert.deepStrictEqual(Object.keys(response.cookies[0]), ["name", "value", "maxAge", "path", "httpOnly", "secure", "sameSite"]);
        assert.equal(response.cookies[0].name, 'accessToken');
        assert.equal(response.cookies[1].name, 'refreshToken');
    });

    //TODO: check expire token
    it('POST /refresh-token must respond 400 if no refresh token passed in request.cookies', async (t) => {
        const response = await app.inject({
            url: 'api/auth/refresh-token',
            method: 'POST',
            cookies: {}
        });
        assert.equal(response.statusCode, 400);
        assert.deepStrictEqual(response.json(), { success: false, error: 'Refresh token missing' });
    });

    it('POST /refresh-token respond 200', async (t) => {
        const response = await app.inject({
            url: 'api/auth/refresh-token',
            method: 'POST',
            cookies: { refreshToken }
        });

        assert.equal(response.statusCode, 200);
    });

    it('should authenticate', async (t) => {
        const response = await app.inject({
            url: '/secret',
            method: 'GET',
            cookies: {
                accessToken
            }
        });
        assert.equal(response.statusCode, 200);
    });
});
/*
describe('Test with authorization header', async () => {
    let pool: FastifyMySQLOptions = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };
    let accessToken: string | undefined;
    //let refreshToken: string;
    const user = {
        email: 'userTest@example.com',
        username: 'userTest',
        password: 'password123'
    }
    let app = fastify();

    app.register(fastifyCors, {
        origin: ['http://localhost:8000'], // Allowed origins
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
        credentials: true, // Allow cookies to be sent with requests
    });
    app.register(fastifyRateLimit, {
        max: 100,
        timeWindow: '1 minute'
    });

    await app.register(authentication, {
        routePrefix: 'api/auth',
        databasePool: pool,
    });

    app.get('/secret', { preHandler: app.authenticate }, (request, reply) => {
        return { message: 'shhh its a secret' };
    });

    before(async () => {
        await truncateUsersTable();
    });

    after(async () => app.close());

    it('should store token in header', async () => {
        await app.inject({
            url: 'api/auth/register',
            method: 'POST',
            body: user
        });
        const loginResponse = await app.inject({
            url: '/api/auth/login',
            method: 'post',
            body: {
                email: user.email,
                password: user.password
            }
        });
        const containHeader = Object.keys(loginResponse.headers).includes('authorization');
        accessToken = containHeader ? loginResponse.headers.authorization?.split(' ')[1] : '';
        if (accessToken) {
            assert.equal(loginResponse.statusCode, 200);
            assert.equal(containHeader, true);
            assert.equal(typeof loginResponse.json().accessToken, 'string');
            assert.equal(accessToken.length > 10, true);
        }
    });

    it('should authenticate', async () => {
        const response = await app.inject({
            url: '/secret',
            method: 'get',
            headers:{
                'authorization':`Bearer ${accessToken}`
            }
        });
        assert.equal(response.statusCode,200);
    });
});
*/