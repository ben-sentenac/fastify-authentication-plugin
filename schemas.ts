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