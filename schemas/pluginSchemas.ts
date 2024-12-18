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
        tokensOptions: {
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
            },
            required:['accessTokenSecret','refreshTokenSecret'],
        },
        cookieOptions:{
            type:'object',
            properties:{
                secret:{
                    type:'string'
                },
                parseOptions:{
                    type:'object',
                    properties:{
                        httpOnly:{
                            type:'boolean',
                        },
                        secure:{
                            type:['boolean','string']
                        },
                        samesite:{
                            type:'string'
                        },
                        path:{
                            type:'string'
                        }
                    }
                }
            },
            required:['secret']
        }
    },
    required:['databasePool','tokensOptions','cookieOptions']
};

