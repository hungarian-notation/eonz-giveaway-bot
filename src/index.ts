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
    })
    .option("start", {
        type: "boolean",
        description: "starts the bot in active mode"
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

if (argv.start) {
    bot.state = GatekeeperBot.State.Active;
}

bot.connect();

process.stdin.resume();

function exitHandler(options: { exit?: boolean, cleanup?: boolean }, exitCode: number = 0) {
    if (options.cleanup) {
        (async () => {
            console.log("closing sqlite connection...");
            await bot.database.activeConnection?.close();
            console.log("sqlite connection closed.")
            if (options.exit) process.exit(exitCode);
        })();
    } else {
        if (options.exit) process.exit(exitCode);        
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,   { exit: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { cleanup: true, exit: true }));
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit:true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit:true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));