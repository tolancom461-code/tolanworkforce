import mysql from 'mysql2/promise';
import fs from 'fs';

async function backupDatabase() {
  try {
    // Get DATABASE_URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL not found in environment');
      process.exit(1);
    }

    // Parse connection details
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):([^\/]+)\/(.+?)(\?|$)/);
    if (!match) {
      console.error('Invalid DATABASE_URL format');
      process.exit(1);
    }

    const [, user, password, host, port, database] = match;
    
    console.log(`Creating backup for database: ${database}`);
    console.log(`Host: ${host}:${port}`);
    
    // Create connection with SSL
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: true
      }
    });

    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log(`Found ${tableNames.length} tables:`, tableNames.join(', '));

    let sqlDump = `-- Database Backup: ${database}\n`;
    sqlDump += `-- Date: ${new Date().toISOString()}\n`;
    sqlDump += `-- Tables: ${tableNames.length}\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

    // Dump each table
    for (const tableName of tableNames) {
      console.log(`Backing up table: ${tableName}`);
      
      // Get CREATE TABLE statement
      const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      sqlDump += `-- Table: ${tableName}\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlDump += createTable[0]['Create Table'] + ';\n\n';

      // Get table data
      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
      
      if (rows.length > 0) {
        // Get column names
        const columns = Object.keys(rows[0]);
        const columnList = columns.map(c => `\`${c}\``).join(', ');
        
        sqlDump += `-- Data for table: ${tableName}\n`;
        
        for (const row of rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'boolean') return val ? '1' : '0';
            return val;
          }).join(', ');
          
          sqlDump += `INSERT INTO \`${tableName}\` (${columnList}) VALUES (${values});\n`;
        }
        
        sqlDump += `\n`;
        console.log(`  - Exported ${rows.length} rows`);
      } else {
        console.log(`  - Table is empty`);
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;

    // Write to file
    const filename = `/home/ubuntu/tolanworkforce-backup-${Date.now()}.sql`;
    fs.writeFileSync(filename, sqlDump);
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`File: ${filename}`);
    console.log(`Size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);

    await connection.end();
    
    return filename;
  } catch (error) {
    console.error('Error creating backup:', error);
    process.exit(1);
  }
}

backupDatabase();
