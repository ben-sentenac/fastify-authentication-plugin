import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { LoginRequestRouteSchema,RegisterRouteSchema } from "../schemas/routesSchemas.js";
import { loginHandler, logoutHandler, refreshTokenHandler, registerHandler } from "../services/services.js";
//TODO: Add rate limit on sensible routes login logout token 
export async function routes(fastify: FastifyInstance) {

    fastify.get('/up', (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send({ status: 'OK' }));
    fastify.post('/register',{schema:RegisterRouteSchema}, registerHandler);
    fastify.post('/login',{schema:LoginRequestRouteSchema},loginHandler);
    fastify.post('/logout',{preHandler:fastify.authenticate},logoutHandler);
    fastify.post('/refresh-token',refreshTokenHandler);
    
};