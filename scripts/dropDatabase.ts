import { getConnection } from "../utils/database.utils.js";


export async function dropDatabase(dbName:string) {
    if(typeof dbName !== 'string' || dbName === '') throw new TypeError(`parameter [dbName] must be a valid string`);
    const database = dbName;
    const conn = await getConnection();
    const sql = `DROP DATABASE IF EXISTS ${conn.escapeId(database)}`;
    try {
        await conn.execute(sql);
        console.log(`Database ${dbName} successfully removed!`);
    } catch (error) {
        console.error('Error while droping datbase',error);
        process.exit(1)
    } finally {
        conn.end();
    }
}

await dropDatabase(process.env.DB_NAME ?? 'authentication_test_db');