import { FastifyInstance, FastifyRequest,FastifyReply,RouteHandlerMethod } from 'fastify';
import fp from 'fastify-plugin';
import { routes } from './routes.js';
import { AuthPluginOptions } from './types.js';

import { deepMerge } from './utils/functions.js';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { randomBytes } from 'node:crypto';
import fastifyMysql, { MySQLPromisePool } from '@fastify/mysql';
import { PluginOptionsSchema } from './schemas.js';
import { validateSchema } from './services.js';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: RouteHandlerMethod,
        mysql:MySQLPromisePool,
        tokenStorageLocation:'cookie' | 'header',
        utils:any
    }
};

async function auth(fastify: FastifyInstance, options: AuthPluginOptions) {

    const defaultOptions = {
        routePrefix: '/auth',
        databasePool:null,
        tokenStorage:'cookie',
        jwtOptions:{
            secret:randomBytes(32).toString('hex'),
        },
        cookieOptions: { //one day
            secret: randomBytes(32).toString('hex'),
            parseOptions:{
                httpOnly:true,//Note: be careful when setting this to true, as compliant clients will not allow client-side JavaScript to see the cookie in document.cookie.
                maxAge:1800,
                path:'/',
                secure:true
            }
        },
        refreshTokenOptions:{
            expires:24*60*60,
        }
    };

    const pluginOptions = deepMerge({ ...defaultOptions}, options );
    //validate options;
   validateSchema(PluginOptionsSchema,pluginOptions);

    
    const { jwtOptions, routePrefix, cookieOptions, databasePool,refreshTokenOptions } = pluginOptions;

    if(!fastify.hasDecorator('mysql')) {
        fastify.register(fastifyMysql,{
            promise:true,
            ...databasePool
        });
    }  
    if(!fastify.hasDecorator('jwt')) {
        fastify.register(fastifyJwt,jwtOptions);
    }
    if(!fastify.hasDecorator('serializeCookie')) {
        fastify.register(fastifyCookie,cookieOptions);
    }
    fastify.decorate('tokenStorageLocation',pluginOptions.tokenStorage);
    fastify.decorate('utils',{
        refreshTokenExpires:refreshTokenOptions.expires
    });

    /**
     * token is stored in cookie we could also store in headers {authorization: Bearer ${token} and use request.JwtVerify()}
     */
    fastify.decorate('authenticate',async (request:FastifyRequest,reply:FastifyReply) => {
       try {
        let accessToken;
            if(fastify.tokenStorageLocation === 'header') {
                accessToken = request.headers.authorization?.split(' ')[1].trim();
            } else {
                accessToken = request.cookies.accessToken
            }
           if(!accessToken) {
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
            reply.code(401).send({success:false,error:'Unauthorized',message:error instanceof Error ? error.message : String(error)})
       }
    });

    //base routes 
    fastify.register(routes, { prefix: routePrefix });

    fastify.setErrorHandler((error,request,reply) => {
        if(error.code === 'FST_ERR_VALIDATION') {
            return reply.code(400).send({success:false,error:error.message});
        }
        fastify.log.error(`ERROR:${error.message}`);
        return reply.code(500).send({
            status:false,
            message:'Internal server errror'
        });
    });
}
export default fp(auth, {
    name: 'fastify-auth-module',
    fastify: '5.x',
    dependencies:['@fastify/rate-limit','@fastify/cors']
});