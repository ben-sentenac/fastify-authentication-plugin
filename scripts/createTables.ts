import { exec } from "child_process";
import { promisify } from "util";


const execPromise = promisify(exec);

export async function createTables() {
    try {
        const mysql = await execPromise(`mysql -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < scripts/auth.sql`);
        console.log(mysql.stdout);
    } catch (error) {
        console.error(error);
    }
}

await createTables();





