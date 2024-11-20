import { FastifyCookieOptions } from "@fastify/cookie"
import { FastifyJWTOptions } from "@fastify/jwt"
import { FastifyMySQLOptions } from "@fastify/mysql"

export interface AuthPluginOptions {
    createTable?:boolean
    routePrefix?:string,
    databasePool:FastifyMySQLOptions,
    jwtOptions?:FastifyJWTOptions,
    cookieOptions?:FastifyCookieOptions
};


export interface User {
    id:string | number,
    username:string,
    email:string,
    email_verified_at:Date | null,
    password:string,
    remember_token:string | null,
    created_At:Date,
    updated_At:Date
};

export interface Role {
    id:string | number,
    role_name:string,
    description:string,
    created_At:Date,
    updated_At:Date
};


export interface UserRole {
    user_id:User["id"],
    role_id:Role["id"]
};

export interface PasswordResetToken {
    email:string,
    token:string,
    created_at:Date
}

export interface Session {
    id:string | number,
    user_id:User["id"],
    ip_address:number | null,
    user_agent:string | null,
    payload:string,
    last_activity:number
}

export interface RefreshToken {
    id: string | number; // Primary key, supports both string or number
    user_id: User["id"]; // Foreign key to the User table
    refresh_token: string; // The actual refresh token
    ip_address: string | null; // IP address of the user (nullable)
    user_agent: string | null; // User agent details (nullable)
    expires_at: Date; // Expiration timestamp for the token
    created_at: Date; // When the token was created
    updated_at: Date; // When the token was last updated
}


export interface LoginRequestBody {
    email:string,
    password:string
}

export interface RegisterRequestBody {
    email:string,
    username:string,
    password:string
}

export interface JWTPayload {
    id:number,
    email:string,
    iat:Date,
    exp:Date
}