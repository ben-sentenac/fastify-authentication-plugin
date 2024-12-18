import { FastifyInstance } from 'fastify';
import { hash,compare } from  'bcrypt';
import { User } from "../types/types.js";
import fastifyJwt from "@fastify/jwt";
import { Ajv,Schema } from 'ajv';


const SALT_ROUND = 12;

export async function hashPassword(password: string) {
    return hash(password, SALT_ROUND);
}

export async function verifyPassword(password: string, hash: string) {
    return compare(password, hash);
}
export function generateJWT(fastify: FastifyInstance,user: Partial<User>,options?:Partial<fastifyJwt.SignOptions>) {
    return fastify.jwt.sign(user,options);
}

export function verifyToken(fastify:FastifyInstance,token:string,options?:Partial<fastifyJwt.VerifyOptions>,) {
    const decoded = fastify.jwt.verify(token,options);
    if(!decoded) throw new Error('ERR_TOKEN, token error');
    return decoded;
}

export function validateSchema(schema:Schema,object:Record<string,any>) {
    const ajv = new Ajv({
        allowUnionTypes: true
    });
    const valid = ajv.validate(schema, object);
    if (!valid) {
        console.error(ajv.errors);
        if (ajv.errors) {
            for (const error of ajv.errors) {
                throw new TypeError(`Auth plugin fail to load > OPTIONS_ERROR: options${error.instancePath.replaceAll('/','.')} ${error.message}`);
            }
        }
    }
    return valid;
}