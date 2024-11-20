import { getConnection } from "../utils/database.utils.js";


export async function createDatabase(dbName:string) {
    if(typeof dbName !== 'string' || dbName === '') throw new TypeError(`parameter [dbName] must be a valid string`);
    const database = dbName;
    const conn = await getConnection();
    const sql = `CREATE DATABASE IF NOT EXISTS ${conn.escapeId(database)}`;
    try {
        await conn.execute(sql);
        console.log(`Database ${dbName} successfully created!`);
    } catch (error) {
        console.error('Error while creating datbase',error);
        process.exit(1)
    } finally {
        conn.end();
    }
}

await createDatabase(process.env.DB_NAME ?? 'authentication_test_db');