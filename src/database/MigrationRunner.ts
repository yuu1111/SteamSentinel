import Database from 'better-sqlite3';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

interface Migration {
    filename: string;
    version: number;
    sql: string;
}

export class MigrationRunner {
    constructor(private db: Database.Database) {}

    runMigrations(): void {
        try {
            // Create migrations tracking table if it doesn't exist
            this.createMigrationsTable();

            // Get all migration files
            const migrations = this.loadMigrations();
            
            // Get already applied migrations
            const appliedMigrations = this.getAppliedMigrations();

            // Run pending migrations
            for (const migration of migrations) {
                if (!appliedMigrations.includes(migration.filename)) {
                    this.runMigration(migration);
                }
            }

            logger.info('All migrations completed successfully');
        } catch (error) {
            logger.error('Migration failed:', error);
            throw error;
        }
    }

    private createMigrationsTable(): void {
        const sql = `
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                version INTEGER NOT NULL,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        this.db.exec(sql);
    }

    private loadMigrations(): Migration[] {
        const migrationsDir = path.join(__dirname, 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            logger.warn('Migrations directory not found');
            return [];
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        const migrations: Migration[] = [];

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            const version = this.extractVersionFromFilename(file);
            
            migrations.push({
                filename: file,
                version,
                sql
            });
        }

        return migrations;
    }

    private extractVersionFromFilename(filename: string): number {
        const match = filename.match(/^(\d+)_/);
        return match ? parseInt(match[1], 10) : 0;
    }

    private getAppliedMigrations(): string[] {
        const stmt = this.db.prepare('SELECT filename FROM migrations ORDER BY version');
        const rows = stmt.all() as { filename: string }[];
        return rows.map(row => row.filename);
    }

    private runMigration(migration: Migration): void {
        logger.info(`Running migration: ${migration.filename}`);

        const transaction = this.db.transaction(() => {
            // Execute the migration SQL
            this.db.exec(migration.sql);
            
            // Record migration as applied
            const insertStmt = this.db.prepare('INSERT INTO migrations (filename, version) VALUES (?, ?)');
            insertStmt.run(migration.filename, migration.version);
        });

        try {
            transaction();
            logger.info(`Migration ${migration.filename} completed successfully`);
        } catch (error) {
            logger.error(`Migration ${migration.filename} failed:`, error);
            throw error;
        }
    }

    rollbackLastMigration(): void {
        // Get last applied migration
        const lastMigration = this.getLastAppliedMigration();
        
        if (!lastMigration) {
            logger.info('No migrations to rollback');
            return;
        }

        logger.info(`Rolling back migration: ${lastMigration.filename}`);
        
        // Remove from migrations table
        const deleteStmt = this.db.prepare('DELETE FROM migrations WHERE filename = ?');
        deleteStmt.run(lastMigration.filename);
        
        logger.info(`Migration ${lastMigration.filename} rolled back`);
    }

    private getLastAppliedMigration(): {filename: string, version: number} | null {
        const stmt = this.db.prepare('SELECT filename, version FROM migrations ORDER BY version DESC LIMIT 1');
        return stmt.get() as {filename: string, version: number} | undefined || null;
    }
}