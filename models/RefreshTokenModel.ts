import { MySQLPromisePool, MySQLResultSetHeader, MySQLRowDataPacket } from "@fastify/mysql";
import Model from "./Model.js";
import { RefreshToken } from "../types/types.js";
import { toSQLTimeStamp } from "../utils/database.utils.js";



export default class RefreshTokenModel extends Model
{
    constructor(connection:MySQLPromisePool,table:string = 'RefreshTokens') {
        super(connection,table);
    }

    async find(field:string,value:any) {
        const sql = `SELECT user_id,refresh_token,expires_at FROM ${this.table} WHERE ${this.validateAndEscapeTable(field)}= ?`;
        try {
            const [ storedToken ] = await this.connection.execute<MySQLRowDataPacket[]>(sql, [value]);
            return storedToken.length ? storedToken[0] : null;
        } catch (error) {
            console.error(`Failed to find RefreshToken : ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Failed to find RefreshToken');
        }
    }
    async store(token:Omit<RefreshToken,'id'|'created_at'|'updated_at'>) {
       const sql = `INSERT INTO ${this.table} (user_id, refresh_token, ip_address, user_agent, expires_at) VALUES(?,?,?,?,?)`;
       const { user_id,refresh_token,ip_address,user_agent,expires_at } = token;
       try {
            const [ refreshToken ] = await this.connection.execute<MySQLResultSetHeader>(sql,
                [user_id,refresh_token,ip_address,user_agent,toSQLTimeStamp(expires_at)]);
            return refreshToken;
       } catch (error) {
        console.error(error);
        console.error(`Failed to store refreshToken: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error('Failed to store RefrehToken.');
       }
    }
}
