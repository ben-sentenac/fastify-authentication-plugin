## env var 

AUTH_ACCESS_TOKEN_SECRET
AUTH_REFRESH_TOKEN_SECRET
ACCESS_TOKEN_EXPIRE
REFRESH_TOKEN_EXPIRE
RESET_PASSWORD_TOKEN_EXPIRE

## auth plugin options
```ts
{
    routePrefix:string,
    databasePool:FastifyMySQLOptions,
    tokensOptions:{
        accessTokenSecret:string
        refreshTokenSecret:string,
        accesTokenExpires:string | number
        refreshTokenExpires:string | number,
        passwordResetToken:string
        csrfToken:string
    },
    cookieOptions: FastifyCookieOptions
}

```



