import { FastifyInstance, FastifyRequest,FastifyReply,RouteHandlerMethod } from 'fastify';
import fp from 'fastify-plugin';
import { routes } from './routes.js';
import { AuthPluginOptions } from './types.js';
import { Ajv } from 'ajv';
import { deepMerge } from './utils/functions.js';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { randomBytes } from 'node:crypto';
import fastifyMysql, { MySQLPromisePool } from '@fastify/mysql';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: RouteHandlerMethod,
        mysql:MySQLPromisePool,
        utils:any
    }
};

const optionsSchema = {
    type: 'object',
    properties: {
        createTable:{
            type:'boolean',
        },
        routePrefix: {
            type: 'string'
        },
        jwtOptions: {
            type:['object'],
        },
        databasePool:{
            type:'object',
            properties:{
                host:{
                    type:'string',
                },
                user:{
                    type:'string'
                },
                password:{
                    type:'string'
                },
                database:{
                    type:'string'
                }
            },
            required:['user','password','database']
        },
        cookieOptions: {
            type: 'object',
            properties: {
                secret: {
                    type: 'string'
                },
                parseOptions:{
                    type:'object'
                }
            }
        }
    }
};

const ajv = new Ajv({
    allowUnionTypes: true
});


async function auth(fastify: FastifyInstance, options: AuthPluginOptions) {

    const defaultOptions = {
        createTable:true,
        routePrefix: '/auth',
        databasePool:null,
        jwtOptions:{
            secret:randomBytes(32).toString('hex'),
        },
        cookieOptions: { //one day
            secret: randomBytes(32).toString('hex'),
            parseOptions:{
                httpOnly:true,//Note: be careful when setting this to true, as compliant clients will not allow client-side JavaScript to see the cookie in document.cookie.
                maxAge:1800,
                path:'/',
                secure:false
            }
        },
        refreshTokenOptions:{
            expires:24*60*60,
        }
    };

    const pluginOptions = deepMerge({ ...defaultOptions}, options );

    const valid = ajv.validate(optionsSchema, pluginOptions);

    if (!valid) {
        console.error(ajv.errors);
        if (ajv.errors) {
            for (const error of ajv.errors) {
                throw new TypeError(`Auth plugin fail to load > OPTIONS_ERROR: options${error.instancePath.replaceAll('/','.')} ${error.message}`);
            }
        }
    }
    const { jwtOptions, routePrefix, cookieOptions, databasePool,createTable,refreshTokenOptions } = pluginOptions;

    if(!fastify.mysql) {
        fastify.register(fastifyMysql,{
            promise:true,
            ...databasePool
        });
    }

    //TODO: create tables  
    if(createTable) {
        //
    }
        
    if(!fastify.jwt) {
        fastify.register(fastifyJwt,jwtOptions);
    }

    if(!fastify.serializeCookie) {
        fastify.register(fastifyCookie,cookieOptions);
    }

    fastify.decorate('utils',{
        refreshTokenExpires:refreshTokenOptions.expires
    });

    /**
     * token is stored in cookie we could also store in headers {authorization: Brearer ${token} and use request.JwtVerify()}
     */
    fastify.decorate('authenticate',async (request:FastifyRequest,reply:FastifyReply) => {
       try {
           const { accessToken } = request.cookies;
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