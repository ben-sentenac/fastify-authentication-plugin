import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { generateJWT, verifyPassword } from "./services.js";
import {  UserModel, RefreshTokenModel} from "./models.js";
import { JWTPayload, LoginRequestBody, RegisterRequestBody } from "./types.js";
import { LoginRequestRouteSchema,RegisterRouteSchema } from "./schemas.js";
//TODO: Add rate limit on sensible routes login logout token 
export async function routes(fastify: FastifyInstance) {

    fastify.get('/up', (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send({ status: 'OK' }));

    fastify.post('/register', {schema:RegisterRouteSchema},async (request:FastifyRequest<{Body:RegisterRequestBody}>,reply) => {
        const { email,username,password } = request.body;
        const userModel = new UserModel(fastify.mysql);
        try {
            const existingUser = await userModel.findByEmail(email);
            if(!existingUser) {
                await userModel.store({username,email,password});
                return reply.code(201).send({success:true});
            } else {
                return reply.code(400).send({success:false,error:'email is already taken'});
            }
        } catch (error) {
            return reply.code(500).send({ error: 'Error registering user' });
        }

    });

    //TODO add ratelimit 
    fastify.post('/login', {schema:LoginRequestRouteSchema}, async (request: FastifyRequest<{Body:LoginRequestBody}>, reply: FastifyReply) => {
        const { email, password } = request.body;
        const userModel = new UserModel(fastify.mysql);
        const { refreshTokenExpires,accessTokenExpires } = fastify.authUtils;
        try {
            const user = await userModel.findByEmail(email);

            if (!user || !(await verifyPassword(password, user.password))) {
                return reply.code(401).send({ success:false, error: 'Invalid credentials' });
            }
    
            const accessToken = generateJWT(fastify,{id: user.id, email: user.email },{expiresIn:accessTokenExpires});
            const refreshToken = generateJWT(fastify,{ id: user.id, email: user.email },{expiresIn:refreshTokenExpires})// Refresh token valid for 7 days
    
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + refreshTokenExpires);

            const refreshTokenModel = new RefreshTokenModel(fastify.mysql);
            
            //TODO if old token invalidate (token rotation)
            //add is valid property 
            await refreshTokenModel.store({
                user_id: user.id,
                refresh_token: refreshToken,
                ip_address: request.ip,
                user_agent: request.headers['user-agent'] ?? null,
                expires_at: expiresAt,
            });
            return reply
                .setCookie(
                    'accessToken',
                    accessToken,
                    {
                        maxAge:accessTokenExpires ?? 15 * 60
                    }
                )
                .setCookie('refreshToken',
                    refreshToken,
                    {
                        maxAge:refreshTokenExpires ?? 7 * 24 * 60 * 60
                    }
                )
                .send({
                    success: true, message: 'Login successful'
                });
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    //POST /LOGOUT 
    //TODO add logic if token stored in header
    fastify.post('/logout',{preHandler:fastify.authenticate}, async (request,reply) => {
        const refreshToken = request.cookies.refreshToken;
        try {
            if (refreshToken) {
                //await removeRefreshToken(refreshToken);
            }
            //TODO: store token in redis 
            //await redis.set(accessToken, 'blacklisted', 'EX', 24 * 60 * 60); // 1 day expiration
            //clear cookie
           // Clear cookies
            return reply
            .clearCookie('accessToken', { path: '/' })
            .clearCookie('refreshToken', { path: '/refresh-token' })
            .send({ message: 'Logged out successfully' });
        } catch (error) {
            reply.status(500).send({ error: 'Logout failed' }); 
        }
    });

    //POST /TOKEN refresh token route
    fastify.post('/refresh-token', async (request:FastifyRequest,reply:FastifyReply) => {
        const { accessTokenExpires } = fastify.authUtils;
        const refreshToken  = request.cookies.refreshToken;
           if(!refreshToken) {
                return reply.code(403).send({ success:false, error: 'forbidden' });
           }
           try {
            const payload:JWTPayload = fastify.jwt.verify(refreshToken);

            const refreshTokenModel = new RefreshTokenModel(fastify.mysql);
            //TODO check if rrefreh token is still valid
            const storedToken = await refreshTokenModel.find('refresh_token',refreshToken);
            if(!storedToken || !payload) {
                throw new Error('Invalid refresh token');
            }

            const newAccessToken = generateJWT(fastify,{id:payload.id,email:payload.email});
            //TODO delete old refreshToken 
            return reply.setCookie(
                'accessToken',
                newAccessToken,
                {
                maxAge:accessTokenExpires ?? 15 * 60}
            ).send({sucess:true, message: 'Access token refreshed' })
           } catch (error) {
            return reply.code(401).send({success:false, error: 'Unauthorized', message: error instanceof Error ? error.message : String(error) });
           }
    });
};