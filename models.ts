import { MySQLPromiseConnection, MySQLPromisePool, MySQLResultSetHeader, MySQLRowDataPacket } from "@fastify/mysql";
import { hashPassword } from "./services.js";
import { RefreshToken } from "./types.js";
import { toSQLTimeStamp } from "./utils/database.utils.js";


abstract class Model {
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

export class UserModel extends Model {
    private readonly rolesTable: string;
    private readonly userRolesTable: string;

    constructor(
        connection: MySQLPromisePool,
        table:string = 'Users',
        rolesTable: string = 'Roles',
        userRolesTable: string = 'UserRoles'
    ) {
        super(connection,table);
        this.rolesTable = this.validateAndEscapeTable(rolesTable);
        this.userRolesTable = this.validateAndEscapeTable(userRolesTable);
    }

    async all(limit: number = 100, offset: number = 0): Promise<MySQLRowDataPacket[] | null> {
        const sql = `SELECT id, username, email FROM ${this.table} LIMIT ? OFFSET ?`;
        try {
            const [users] = await this.connection.query<MySQLRowDataPacket[]>(sql, [limit, offset]);
            return users.length ? users : null;
        } catch (error) {
            console.error(`Failed to fetch users: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Failed to fetch users.');
        }
    }

    async findByEmail(email: string): Promise<MySQLRowDataPacket | null> {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Invalid email address provided.');
        }

        const sql = `SELECT id, email, password FROM ${this.table} WHERE email = ?`;
        try {
            const [user] = await this.connection.execute<MySQLRowDataPacket[]>(sql, [email]);
            return user.length ? user[0] : null;
        } catch (error) {
            console.error(`Failed to find user by email: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Failed to find user by email.');
        }
    }

    async store(user: { username: string; email: string; password: string }): Promise<MySQLResultSetHeader> {
        const { username, email, password } = user;

        if (!username || typeof username !== 'string' || username.trim().length < 3) {
            throw new Error('Invalid username. Must be at least 3 characters.');
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Invalid email address.');
        }
        if (!password || password.length < 9) {
            throw new Error('Invalid password. Must be at least 8 characters.');
        }

        const hashedPassword = await hashPassword(password);
        const sql = `INSERT INTO ${this.table} (username, email, password) VALUES (?, ?, ?)`;

        try {
            const [result] = await this.connection.execute<MySQLResultSetHeader>(sql, [username, email, hashedPassword]);
            return result;
        } catch (error) {
            console.error(`Failed to store User: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Failed to store User.');
        }
    }

    /**
     * Fetch all roles assigned to a user.
     * @param userId - The ID of the user.
     * @returns A list of roles or `null` if no roles are found.
     */
    async getRoles(userId: number): Promise<MySQLRowDataPacket[] | null> {
        const sql = `
            SELECT r.id, r.name 
            FROM ${this.rolesTable} r
            INNER JOIN ${this.userRolesTable} ur ON r.id = ur.role_id
            WHERE ur.user_id = ?
        `;
        try {
            const [roles] = await this.connection.query<MySQLRowDataPacket[]>(sql, [userId]);
            return roles.length ? roles : null;
        } catch (error) {
            console.error(`Failed to fetch roles for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Failed to fetch roles.');
        }
    }

    /**
     * Assign a role to a user.
     * @param userId - The ID of the user.
     * @param roleId - The ID of the role to assign.
     */
    async assignRole(userId: number, roleId: number): Promise<void> {
        const sql = `INSERT INTO ${this.userRolesTable} (user_id, role_id) VALUES (?, ?)`;
        try {
            const [assignedRole] = await this.connection.execute<MySQLResultSetHeader>(sql, [userId, roleId]);
            console.log(`Assigned role: ${assignedRole.affectedRows} rows affected`);
        } catch (error) {
            if (error instanceof Error) {
                if('code' in error && typeof error.code === 'string') {
                    if (error.code === 'ER_DUP_ENTRY') {
                    console.warn(`User ${userId} already has role ${roleId}.`);
                    return; // Silently ignore duplicate role assignments.
                }
                console.error(`Failed to assign role ${roleId} to user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
                throw new Error('Failed to assign role.');
                }
            }
        }
    }

    /**
     * Remove a role from a user.
     * @param userId - The ID of the user.
     * @param roleId - The ID of the role to remove.
     */
    async removeRole(userId: number, roleId: number): Promise<void> {
        const sql = `DELETE FROM ${this.userRolesTable} WHERE user_id = ? AND role_id = ?`;
        try {
            const [removedRole] = await this.connection.execute<MySQLResultSetHeader>(sql, [userId, roleId]);
            if (removedRole.affectedRows === 0) {
                console.warn(`Role ${roleId} not assigned to user ${userId}.`);
            }
        } catch (error) {
            console.error(`Failed to remove role ${roleId} from user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Failed to remove role.');
        }
    }
   

    //TODO: create transaction createUserWithRole
}


export class RefreshTokenModel extends Model
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
