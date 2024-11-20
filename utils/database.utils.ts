import mysql from 'mysql2/promise';

export async function getConnection(database?:boolean) {
  try {
    const credentials = {
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        user: process.env.DB_USER
    }
    //database property does not be set to drop or create db 
    if(database) Object.defineProperty(credentials,'database',{value:process.env.DB_NAME,writable:false})
    const conn = await mysql.createConnection(credentials);
    return conn;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export function toSQLTimeStamp(date:Date) {
  return date.toISOString().slice(0,19).replace('T', ' ');
}
