import * as fs from "fs";
import { GatekeeperBot } from "./bot";
import * as Discord from "discord.js";
import { Personality } from "./personality";
import { match } from "assert";
import { Database } from "sqlite";

import yargs from "yargs";
import { logger, LogLevel } from "./logger";

const argv = yargs
    .help("h").alias("h", "help")
    .option("config", {
        alias: "c",
        default: "./config.json",
        normalize: true,
        description: "specifies an alternative config.json file"
    })
    .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "outputs detailed diagnostic information to the console"
    })
    .option("token", {
        alias: "t",
        type: "string",
        description: "specifes an external file containing the application token to use for the bot"
    }).argv;

if (argv.verbose) {
    logger.level = LogLevel.VERBOSE;
}

const configSource  =   fs.readFileSync(argv.config, { encoding: "utf8" });
const config        =   JSON.parse(configSource);

if (argv.token) {
    const data = fs.readFileSync(argv.token, { encoding: "utf8" });
    config.token = data.trim();
    logger.log("using specified token file: " + argv.token);
}

let bot = new GatekeeperBot(config);

bot.connect();