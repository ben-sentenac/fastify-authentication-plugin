import db from 'mysql2/promise';

export async function getConnection(database = false) {
    const credentials = {
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        user: process.env.DB_USER
    }
    //database property does not be set to drop or create db 
    if(database) Object.defineProperty(credentials,'database',{value:process.env.DB_NAME,writable:false})
    const conn = await db.createConnection(credentials);
    return conn;
}


export async function truncateUsersTable() {
    const conn = await getConnection(true);
    try {
        await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
        await conn.query(`TRUNCATE TABLE UserRoles`);
        await conn.query(`TRUNCATE TABLE Roles`);
        await conn.query(`TRUNCATE TABLE Users`);
        await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
        console.log(`TABLE: Users succesfully reset`);
    } catch (error) {
        if(error instanceof Error) {
            console.error(error.message);
        }
        console.error(`ERROR while truncating Users`);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

export async function createDatabase (database:string) {
    const conn = await getConnection();
    try {
        const sql = `CREATE DATABASE IF NOT EXISTS ${database}`;
        return await conn.query(sql);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}