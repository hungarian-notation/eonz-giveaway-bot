import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'
import * as Discord from "discord.js";
import { logger } from "./logger";
import { isErrorObject } from './util';
 
export type DatabaseConfig = {
    db: string
}

type Connection = Database<sqlite3.Database, sqlite3.Statement>;

export type Candidate = {
    discord: { id: string, username: string },
    minecraft: { username: string }
}

function parseSqlError(e: unknown) {
    const pattern = /^([A-Z_]+)[:] (.*)$/;
    if (isErrorObject(e)) {
        const result = pattern.exec(e.message);

        if (result) {
            return {
                code:   result[1],
                detail: result[2]
            }
        } else {
            return { code: e.message, detail: undefined };
        }
    } else {
        throw new Error("parseSqlError called on non-error");
    }
}

export class GatekeeperDatabase {
    config: DatabaseConfig;
    private connection?: Promise<Connection>;
    private activeConnection?: Connection;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    async close(): Promise<void> {
        if (this.activeConnection) {
            await this.activeConnection.close();
        }
    }   

    private async open(): Promise<Connection> {
        const connection = await open({
          filename: this.config.db,
          driver: sqlite3.Database
        });

        await connection.exec(`
            CREATE TABLE IF NOT EXISTS "users" (
                "discord_id"			TEXT NOT NULL PRIMARY KEY UNIQUE,
                "discord_username"		INTEGER NOT NULL,
                "minecraft_username"	TEXT NOT NULL,
                "selected"				BOOLEAN DEFAULT FALSE
            );

            /* DROP TRIGGER IF EXISTS prevent_duplicate_username_on_insert; */
            /* DROP TRIGGER IF EXISTS prevent_duplicate_username_on_update; */

            CREATE TRIGGER IF NOT EXISTS prevent_duplicate_username_on_insert
                BEFORE INSERT ON users
                WHEN 	(EXISTS(SELECT minecraft_username FROM users WHERE minecraft_username = NEW.minecraft_username))
            BEGIN
                SELECT RAISE(FAIL, "error/duplicate-username");
            END;

            CREATE TRIGGER IF NOT EXISTS prevent_duplicate_username_on_update
                BEFORE UPDATE ON users
                WHEN	NEW.minecraft_username <> OLD.minecraft_username 
                AND		EXISTS(SELECT minecraft_username FROM users WHERE minecraft_username = NEW.minecraft_username)
            BEGIN
                SELECT RAISE(FAIL, "error/duplicate-username");
            END;
        `);

        this.activeConnection = connection;

        return connection;
    }

    async isRegistered(user: Discord.User): Promise<boolean> {
        const id              = user.id;
        const connection      = await this.getConnection();
        const statement       = await connection.prepare("SELECT discord_username FROM users WHERE discord_id = ?");
        const result          = await statement.all(id); 
        await statement.finalize();
        return result.length > 0;
    }

    async register(user: Discord.User, minecraftUser: string, update = false): Promise<boolean> {
        if (!update && (await this.isRegistered(user))) {
            return false;
        } else {
            const connection = await this.getConnection();

            const statement = await connection.prepare(`
                INSERT OR REPLACE INTO users 
                    ( discord_id, discord_username, minecraft_username )
                VALUES
                   ( ?, ?, ? )
            `);

            const result = await statement.run(user.id, user.username, minecraftUser)            
            .catch(e => {
                const err = parseSqlError(e);

                if (err && err.detail) {
                    throw new Error(err.detail);
                } else {
                    throw new Error(err.code);
                }
            });

            await statement.finalize();
            logger.verbose(result);
            return true;
        }
    }

    async all(): Promise<(Candidate & { selected: boolean })[]> {
        const candidates = await (await this.getConnection()).all("SELECT discord_id, discord_username, minecraft_username, selected FROM users");
        return candidates.map(each => {
            // row format is provable from SQL
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const row: { discord_id: string, discord_username: string, minecraft_username: string, selected: number } = each;

            return {
                discord: { id: row.discord_id, username: row.discord_username },
                minecraft: { username: row.minecraft_username },
                selected: row.selected > 0
            }
        });
    }

    async candidates(): Promise<Candidate[]> {
        const candidates = await (await this.getConnection()).all("SELECT discord_id, discord_username, minecraft_username FROM users WHERE selected = FALSE");
        return candidates.map(each => {            
            // row format is provable from SQL
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const row: { discord_id: string, discord_username: string, minecraft_username: string } = each;

            return {
                discord: { id: row.discord_id, username: row.discord_username },
                minecraft: { username: row.minecraft_username }
        }});
    }

    private async setSelected(candidates: Candidate[]) {
        const connection = await this.getConnection();
        return await Promise.all(candidates.map(async each => {
            const statement =  await connection.prepare(`UPDATE users SET selected = TRUE WHERE discord_id = ?`);
            await statement.bind(each.discord.id);
            const result = await statement.run();
            await statement.finalize();
            return result;
        }));
    }

    async selectWinners(count: number): Promise<(Candidate & { selected: true })[]> {
        const candidates: Candidate[] = await this.candidates();
        const winners = [];
        const i_max = Math.min(count, candidates.length);

        for (let i = 0 ; i < i_max; ++i) {
            const j = Math.floor(Math.random() * candidates.length);
            const winner = candidates[j];
            candidates.splice(j, 1)[0];
            winners.push(winner);
        }

        await this.setSelected(winners);

        return winners.map(each => {
            const transformed = Object.assign({}, each, { selected: true } as { selected: true });
            return transformed
        });
    }

    async resetUser(where: { discord: { username: string } } | { discord: { id: string } }): Promise<unknown> {
        let sql;
        let value;

        if ("id" in where.discord) {
            const id = where.discord.id;
            sql = `DELETE FROM users WHERE discord_id = ?`
            value = id;
        } else {
            const username = where.discord.username;
            sql = `DELETE FROM users WHERE discord_username = ?`
            value = username;
        }

        const db = await this.getConnection();
        const statement = await db.prepare(sql);

        const result = await statement.run(value);
        await statement.finalize();
        return result;
    }

    async getConnection(): Promise<Connection> {
        return this.connection ?? (this.connection = this.open());
    }
}