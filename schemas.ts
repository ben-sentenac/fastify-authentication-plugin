export const PluginOptionsSchema = {
    type: 'object',
    properties: {
        routePrefix: {
            type: 'string'
        },
        tokenStorage:{
            enum:['cookie','header']
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