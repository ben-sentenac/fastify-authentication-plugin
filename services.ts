import { FastifyInstance } from 'fastify';
import { hash,compare } from  'bcrypt';
import { User } from "./types.js";
import fastifyJwt from "@fastify/jwt";


const SALT_ROUND = 12;

export async function hashPassword(password: string) {
    return hash(password, SALT_ROUND);
}

export async function verifyPassword(password: string, hash: string) {
    return compare(password, hash);
}
export async function generateJWT(fastify: FastifyInstance,user: Partial<User>,options?:fastifyJwt.FastifyJwtSignOptions) {
    return fastify.jwt.sign({ id: user.id, email: user.email });
}

export function verifyToken(fastify:FastifyInstance,token:string,options?:Partial<fastifyJwt.VerifyOptions>,) {
    const decoded = fastify.jwt.verify(token,options);
    if(!decoded) throw new Error('ERR_TOKEN, token error');
    return decoded;
}


