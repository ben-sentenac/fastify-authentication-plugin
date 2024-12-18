import { FastifyInstance,FastifyRequest,FastifyReply } from "fastify";
 /**
* token is stored in cookie we could also store in headers {authorization: Bearer ${token} and use request.JwtVerify()}
*/
export function authenticate(fastify:FastifyInstance,tokensOptions:unknown) {
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const accessToken = request.headers.authorization?.split(' ')[1].trim() ?? request.cookies.accessToken;
            if (!accessToken) {
                throw new Error('Access denied');
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
}