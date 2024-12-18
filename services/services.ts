
import { FastifyRequest,FastifyReply, FastifyInstance } from 'fastify';
import { JWTPayload, LoginRequestBody, RegisterRequestBody } from "../types/types.js";
import { generateJWT, verifyPassword } from "../utils/authUtils.js";
import RefreshTokenModel from "../models/RefreshTokenModel.js";
import UserModel from "../models/UserModel.js";

export async function registerHandler(this: FastifyInstance, request:FastifyRequest<{Body:RegisterRequestBody}>,reply:FastifyReply) {
    const { email,username,password } = request.body;
        const userModel = new UserModel(this.mysql);
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
}

export async function loginHandler(this:FastifyInstance,request: FastifyRequest<{Body:LoginRequestBody}>, reply: FastifyReply) {
    const { email, password } = request.body;
        const userModel = new UserModel(this.mysql);
        const { refreshTokenExpires,accessTokenExpires } = this.authUtils;
        try {
            const user = await userModel.findByEmail(email);

            if (!user || !(await verifyPassword(password, user.password))) {
                return reply.code(401).send({ success:false, error: 'Invalid credentials' });
            }
    
            const accessToken = generateJWT(this,{id: user.id, email: user.email },{expiresIn:accessTokenExpires});
            const refreshToken = generateJWT(this,{ id: user.id, email: user.email },{expiresIn:refreshTokenExpires})// Refresh token valid for 7 days
    
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + refreshTokenExpires);

            const refreshTokenModel = new RefreshTokenModel(this.mysql);
            
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
}
 
export async function logoutHandler(this:FastifyInstance,request:FastifyRequest,reply:FastifyReply) {
    const refreshToken = request.cookies.refreshToken;
    console.log(refreshToken);
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
}

export async function refreshTokenHandler(this:FastifyInstance,request:FastifyRequest,reply:FastifyReply) {
    const { accessTokenExpires } = this.authUtils;
        const refreshToken  = request.cookies.refreshToken;
           if(!refreshToken) {
                return reply.code(403).send({ success:false, error: 'Forbidden' });
           }
           try {
            const payload:JWTPayload = this.jwt.verify(refreshToken);

            const refreshTokenModel = new RefreshTokenModel(this.mysql);
            //TODO check if rrefreh token is still valid
            const storedToken = await refreshTokenModel.find('refresh_token',refreshToken);
            if(!storedToken || !payload) {
                throw new Error('Invalid refresh token');
            }

            const newAccessToken = generateJWT(this,{id:payload.id,email:payload.email});
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
}


