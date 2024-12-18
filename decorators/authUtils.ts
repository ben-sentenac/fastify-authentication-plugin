import { FastifyInstance } from "fastify";

type AuthUtilsType = {
    accessTokenExpires:number,
    refreshTokenExpires:number
}

export function authUtils(fastify:FastifyInstance,utils:AuthUtilsType) {
    fastify.decorate('authUtils',utils);
}