import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'
import * as Discord from "discord.js";
import { logger } from "./logger";
 
export type DatabaseConfig = {
    db: string
}

type Connection = Database<sqlite3.Database, sqlite3.Statement>;

export type Candidate = {
    discord: { id: string, username: string },
    minecraft: { username: string }
}

function parseSqlError(e: any) {
    const pattern = /^([A-Z_]+)[:] (.*)$/;
    if (typeof e === "object" && ("message" in e)) {
        let result = pattern.exec(e.message);

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
    activeConnection?: Connection;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    private async open(): Promise<Connection> {
        let connection = await open({
          filename: this.config.db,
          driver: sqlite3.Database
        });

        connection.serialize

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

    async isRegistered(user: Discord.User) {
        let id              = user.id;
        let connection      = await this.getConnection();
        let result          = await connection.all(`SELECT discord_username FROM users WHERE discord_id = "${id}"`); 
        return result.length > 0;
    }

    async register(user: Discord.User, minecraftUser: string, update: boolean = false) {
        if (!update && await this.isRegistered(user)) {
            return false;
        } else {
            let connection = await this.getConnection();

            let result = await connection.run(`
                INSERT OR REPLACE INTO users 
                    ( discord_id, discord_username, minecraft_username )
                VALUES
                    ( "${user.id}", "${user.username}", "${minecraftUser}" )`)
            .catch(e => {
                let err = parseSqlError(e);

                if (err && err.detail) {
                    throw new Error(err.detail);
                } else {
                    throw new Error(err.code);
                }
            });

            logger.verbose(result);
        }
    }

    async all(): Promise<(Candidate & { selected: boolean })[]> {
        let candidates = await (await this.getConnection()).all("SELECT discord_id, discord_username, minecraft_username, selected FROM users");
        return candidates.map(each => ({
            discord: { id: each.discord_id, username: each.discord_username },
            minecraft: { username: each.minecraft_username },
            selected: each.selected > 0
        }));
    }

    async candidates(): Promise<Candidate[]> {
        let candidates = await (await this.getConnection()).all("SELECT discord_id, discord_username, minecraft_username FROM users WHERE selected = FALSE");
        return candidates.map(each => ({
            discord: { id: each.discord_id, username: each.discord_username },
            minecraft: { username: each.minecraft_username }
        }));
    }

    private async setSelected(candidates: Candidate[]) {
        let connection = await this.getConnection();
        return await Promise.all(candidates.map(async each => {
            let sql = `UPDATE users SET selected = TRUE WHERE discord_id = ${each.discord.id}`;
            return await connection.exec(sql);
        }));
    }

    async selectWinners(count: number) {
        let candidates: Candidate[] = await this.candidates();
        let winners = [];
        let i_max = Math.min(count, candidates.length);

        for (var i = 0 ; i < i_max; ++i) {
            let j = Math.floor(Math.random() * candidates.length);
            let winner = candidates[j];
            candidates.splice(j, 1)[0];
            winners.push(winner);
        }

        this.setSelected(winners);

        return winners;
    }

    async resetUser(where: { discord: { username: string } } | { discord: { id: string } }) {
        var sql;

        if ("id" in where.discord) {
            let id = where.discord.id;
            sql = `DELETE FROM users WHERE discord_id = "${id}"`
        } else {
            let username = where.discord.username;
            sql = `DELETE FROM users WHERE discord_username = "${username}"`
        }

        let db = await this.getConnection();
        return await db.run(sql);
    }

    async getConnection(): Promise<Connection> {
        return this.connection ?? (this.connection = this.open());
    }

}