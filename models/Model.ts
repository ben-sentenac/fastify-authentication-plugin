import { MySQLPromiseConnection, MySQLPromisePool } from "@fastify/mysql";


export default abstract class Model {
    protected readonly connection: MySQLPromisePool;
    protected readonly table: string;

    constructor(connection:MySQLPromisePool,table:string) {
        this.connection = connection;
        this.table = this.validateAndEscapeTable(table);
    }

   protected validateAndEscapeTable(table: string): string {
        if (!/^[a-zA-Z0-9_]+$/.test(table)) {
            throw new TypeError('Invalid table name. Only alphanumeric characters and underscores are allowed.');
        }
        return this.connection.escapeId(table);
    }

    async transaction<T>(callback:(connection:MySQLPromiseConnection) => Promise<T>) {
        const connection = await this.connection.getConnection()
        try {
            await connection.beginTransaction();
            await callback(connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            console.error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Transaction failed.');
        } finally {
            connection.release();
        }
    }
}


