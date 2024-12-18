import { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod } from 'fastify';
import fp from 'fastify-plugin';
import { routes } from './routes.js';
import { AuthPluginOptions } from './types.js';

import { deepMerge } from './utils/functions.js';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyMysql, { MySQLPromisePool } from '@fastify/mysql';
import { PluginOptionsSchema } from './schemas.js';
import { validateSchema } from './services.js';

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
    fastify.decorate('authUtils', {
        accessTokenExpires,
        refreshTokenExpires
    });

    /**
     * token is stored in cookie we could also store in headers {authorization: Bearer ${token} and use request.JwtVerify()}
     */
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const accessToken = request.headers.authorization?.split(' ')[1].trim() ?? request.cookies.accessToken;
            if (!accessToken) {
                throw new Error('Missing token');
            }
            //TODO:
            /* Check if token is blacklisted
             const blacklisted = await isTokenBlacklisted(token, redis);
             if (blacklisted) throw new Error('Token blacklisted');*/
            const decoded = fastify.jwt.verify(accessToken);
            request.user = decoded;
        } catch (error) {
            console.error(error);
            reply.code(401).send({ success: false, error: 'Unauthorized', message: error instanceof Error ? error.message : String(error) })
        }
    });

    //base routes 
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