export const PluginOptionsSchema = {
    type: 'object',
    properties: {
        routePrefix: {
            type: 'string'
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
        tokens: {
            type: 'object',
            properties: {
                accessTokenSecret: {
                    type: 'string'
                },
               refreshTokenSecret:{
                    type:'string'
                },
                accessTokenExpires:{
                    type:'number'
                },
                refreshTokenExpires:{
                    type: 'number'
                },
                rememberToken:{
                    type:'string'
                },
                passwordResetToken:{
                    type:'string'
                },
            }
        },
        cookieOptions:{
            type:'object'
        }
    }
};




export const  LoginRequestRouteSchema = {
    body:{
        type:'object',
        properties:{
            email:{
                type:'string',
                format:'email'
            },
            password:{
                type:'string',
                minLength:9
            }
        },
        required:['email','password']
    }
};


export const RegisterRouteSchema = {
    body:{
        type:'object',
        properties:{
            email:{
                type:'string',
                format:'email'
            },
            username:{
                type:'string'
            },
            password:{
                type:'string',
                minLength:9
            }
        },
        required:['email','username','password']
    }
}