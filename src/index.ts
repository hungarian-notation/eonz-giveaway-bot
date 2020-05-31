import * as fs from "fs";
import { GatekeeperBot } from "./bot";
import * as Discord from "discord.js";
import { Personality } from "./personality";
import { match } from "assert";
import { Database } from "sqlite";

import yargs from "yargs";
import { logger, LogLevel } from "./logger";
import { ConfigObject } from "./config";
import { RecursivePartial } from "./util";
import { default as json5 } from "json5";

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

const configSource = fs.readFileSync(argv.config, { encoding: "utf8" });


const config = json5.parse(configSource) as RecursivePartial<ConfigObject>;

if (argv.token) {
    const data = fs.readFileSync(argv.token, { encoding: "utf8" });
    config.token = data.trim();
    logger.log("using specified token file: " + argv.token);
}

const bot = new GatekeeperBot(config);

if (argv.start) {
    void bot.setState(GatekeeperBot.State.Active);
}

void bot.connect();

process.stdin.resume();

function exitHandler(options: { exit?: boolean, cleanup?: boolean }, exitCode = 0) {
    if (options.cleanup) {
        void (async () => {
            logger.log("closing sqlite connection...");
            await bot.disconnect();
            logger.log("sqlite connection closed.")
            if (options.exit) process.exit(exitCode);
        })();
    } else {
        if (options.exit) process.exit(exitCode);        
    }
}

bot.ondisconnect = () => exitHandler({ exit: true }, 0);

process.on('exit',      exitHandler.bind(null, { exit: true }));
process.on('SIGINT',    exitHandler.bind(null, { cleanup: true, exit: true }));
process.on('SIGUSR1',   exitHandler.bind(null, { exit:true }));
process.on('SIGUSR2',   exitHandler.bind(null, { exit:true }));

//catches uncaught exceptions
process.on('uncaughtException', (e) => {
    logger.error(e);
    exitHandler({exit:true}, 1);
});