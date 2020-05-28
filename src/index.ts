import * as fs from "fs";
import { GatekeeperBot } from "./bot";
import * as Discord from "discord.js";
import { Personality } from "./personality";
import { match } from "assert";
import { Database } from "sqlite";

const configSource  =   fs.readFileSync("./config.json", { encoding: "utf8" });
const config        =   JSON.parse(configSource);
let bot             =   new GatekeeperBot(config);

bot.connect();