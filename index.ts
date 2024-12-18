import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import fp from 'fastify-plugin';
import { routes } from './routes/routes.js';
import { AuthPluginOptions } from './types/types.js';
import { deepMerge } from './utils/functions.js';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyMysql, { MySQLPromisePool } from '@fastify/mysql';
import { PluginOptionsSchema } from './schemas/pluginSchemas.js';
import { validateSchema } from './utils/authUtils.js';
import { authenticate } from './decorators/authenticate.js';
import { authUtils } from './decorators/authUtils.js';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: RouteHandlerMethod,
        mysql: MySQLPromisePool,
        authUtils: {
            refreshTokenExpires: number,
            accessTokenExpires: number
        }
    }
};

async function auth(fastify: FastifyInstance, options: AuthPluginOptions) {

    const defaultOptions = {
        routePrefix: 'auth',
        tokensOptions: {
            accesTokenExpires: 15 * 60,
            refreshTokenExpires: 7 * 24 * 60 * 60,
            //rememberToken: randomBytes(32).toString(),
            //passwordResetToken: randomBytes(32).toString()
        },
        cookieOptions: {
            parseOptions: {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path: '/',
            }
        }
    };

    validateSchema(PluginOptionsSchema, options);
    const pluginOptions = deepMerge({ ...defaultOptions }, options);

    const { tokensOptions, routePrefix, databasePool, cookieOptions } = pluginOptions;
    const { accessTokenSecret, accessTokenExpires, refreshTokenExpires } = tokensOptions;

    if (!fastify.hasDecorator('mysql')) {
        fastify.register(fastifyMysql, {
            promise: true,
            ...databasePool
        });
    }
    if (!fastify.hasDecorator('jwt')) {
        fastify.register(fastifyJwt, {
            secret: accessTokenSecret,
            sign:{
                algorithm:'HS256'
            }
        });
    }
    if (!fastify.hasDecorator('serializeCookie')) {
        fastify.register(fastifyCookie, {
            secret: cookieOptions.secret,
            parseOptions: {
                maxAge: accessTokenExpires,
                ...cookieOptions.parseOptions
            }
        });
    }

    //add decorators
    authenticate(fastify,tokensOptions);
    authUtils(fastify,{accessTokenExpires,refreshTokenExpires});

    //add routes
    fastify.register(routes, { prefix: routePrefix });

    fastify.setErrorHandler((error, request, reply) => {
        if (error.code === 'FST_ERR_VALIDATION') {
            return reply.code(400).send({ success: false, error: error.message });
        }
        fastify.log.error(`ERROR:${error.message}`);
        return reply.code(500).send({
            status: false,
            message: 'Internal server errror'
        });
    });
}
export default fp(auth, {
    name: 'fastify-auth-module',
    fastify: '5.x',
    dependencies: ['@fastify/rate-limit', '@fastify/cors']
});