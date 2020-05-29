import * as Discord from "discord.js";

import { Personality, PersonalityConfig, Variables } from "./personality";
import { GatekeeperDatabase, DatabaseConfig, Candidate } from "./database";
import { logger } from "./logger";
import chalk from "chalk";

type ConfigObject = DatabaseConfig & {
    token: string;
    prefix: string;
    channels: ChannelsObject;
    personality: PersonalityConfig;
    playerIdentities: string;
    whitelistCommand: string;
  }

interface ChannelsObject {
    public: string;
    control: string;
    bridge: string;
}

export class GatekeeperBot {
    client?:                Promise<Discord.Client>;
    config:                 ConfigObject;
    personality:            Personality;
    database:               GatekeeperDatabase;
    commands:               GatekeeperBot.Command[];


    private connected?:     Promise<any>;

    constructor(config: ConfigObject) {
        this.config = config;
        this.personality = new Personality(config.personality);
        this.personality.defaults.prefix = this.config.prefix;        
        this.database = new GatekeeperDatabase(config);
        this.commands = [
            new Commands.RegisterCommand(),
            new Commands.SayCommand(),
            new Commands.AnnounceCommand(),
            new Commands.StatusCommand(),
            new Commands.ListCommand(),
            new Commands.DrawCommand(),
            new Commands.ResetUsernameCommand(),
            new Commands.ResetIdCommand()
        ];
    }

    async connect() {    
        
        if (this.client != undefined) {
            return this.client;
        }

        logger.log(`connecting...`);

        let client = new Discord.Client();

        this.client = new Promise((resolve, reject) => {
            client.login(this.config.token).then(() => resolve(client), (e) => reject(e));         

            client.on("message", message => {
                if (message.author.bot) {
                    return;
                }

                this.handleMessage(message);
            });
        });
        
        this.client.then(() => {            
            logger.log(`connected as: ${client.user?.username}#${client.user?.discriminator}`);

            this.personality.defaults["client_username"] = client.user!.username;
            this.personality.defaults["client_id"] = client.user!.id;

            this.onConnect();
        })

        return this.client;
    }

    private getCommands(scope: GatekeeperBot.CommandType) {
        return this.commands.filter(each => each.type == scope);
    }

    private async onConnect() {
        let adminCommands
        this.sendControl("help/control-channel", { commands: this.getCommands(GatekeeperBot.CommandType.Admin).map(each => each.getHelp(this)).join("\n") });
    }

    private async handleMessage(message: Discord.Message) {
        if (message.channel.type == "dm") {
            // in dm
            this.handleDirectMessage(message);
        } else if (message.channel.id == this.config.channels.control) {
            this.handleControlMessage(message);
        }
    }
    private async getTextChannel(id: string): Promise<Discord.TextChannel> {
        let client  = await this.connect();
        let channel = await (client.channels.cache.get(id) || client.channels.fetch(id));

        if (channel) {
            return channel as Discord.TextChannel;
        } else {
            throw new Error("no such channel");
        }
    }

    private async send(id: "public" | "control" | "bridge", message: string | Discord.MessageEmbed, options?: Variables) {
        if (typeof message == "string") {
            message = this.personality.get(message, options || {}, false);
        }

        let channel = await this.getTextChannel(this.config.channels[id]);      

        if (typeof message == "string" && message.length > 1950) {
            console.log(`message exceeded character limit:`);
            console.log(message);
            await this.send("control", "***Warning:***" + "\n" + 
            `A message that was directed towards the ${id} text channel was too long (${message.length} characters). ` +
            `It has been written to my console output instead.`);
        } else {
            await channel.send(message);
        }
    }

    async sendChat(message: string, options?: Variables) {
        return this.send("public", message, options);
    }

    async sendConsoleCommand(message: string, options?: Variables) {
        return this.send("bridge", message, options);
    }

    async sendControl(message: string, options?: Variables) {
        return this.send("control", message, options);
    }

    async handleCommand(scope: GatekeeperBot.CommandType, message: Discord.Message, command: string, args: string | undefined) {
        let allowed = this.commands.filter(each => each.type == scope);
        let matched = allowed.filter(each => each.name.toLowerCase() == command.toLowerCase())[0];
        
        if (matched) {
            return matched.exec(this, message, command, args);
        } else {
            let validCommands = allowed.map(each => `\`${this.config.prefix}${each.name}\``).join(", ");
            return message.reply(this.personality.get("help/unknown-command", { command, validCommands }));
        }
    }

    tryCommand(scope: GatekeeperBot.CommandType, message: Discord.Message) {
        const COMMAND_PATTERN   = /^([a-zA-Z-]+)(?: (.*))?$/;

        let prefixed = message.content.startsWith(this.config.prefix) ? message.content.slice(this.config.prefix.length) : undefined;
        let matchedCommand = prefixed ? COMMAND_PATTERN.exec(prefixed) : undefined;

        if (matchedCommand) {        
            let command = matchedCommand[1];
            let args = matchedCommand[2];
            return this.handleCommand(scope, message, command, args);
        } else {
            return undefined;
        }
    }

    async handleDirectMessage(message: Discord.Message) { 
        logger.verbose(chalk.blueBright(`direct message: `) + `${message.author.username}: ${message.content}`);
        if (!this.tryCommand(GatekeeperBot.CommandType.Public, message)) {        
            message.reply(this.personality.get("help", { discordUser: message.author.username }));
        }
    }

    private async handleControlMessage(message: Discord.Message) {
        logger.verbose(chalk.greenBright(`control message: `) + `${message.author.username}: ${message.content}`);
        this.tryCommand(GatekeeperBot.CommandType.Admin, message);
    }

    async giveRewardsTo(candidate: Candidate) {
        this.sendConsoleCommand("minecraft/whitelist", { minecraftUser: candidate.minecraft.username })

        let client = await this.connect();
        let user = await client.users.fetch(candidate.discord.id);
        user.send(this.personality.get("win", { 
            discordUser: candidate.discord.username, 
            minecraftUser: candidate.minecraft.username 
        }));
    }
}

export namespace GatekeeperBot {
    export abstract class Command {
        abstract get type(): CommandType;
        abstract get name(): string;
        abstract get help(): { arg?: string, description: string };
        abstract exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<any>;
        
        getHelp(bot: GatekeeperBot): string {
            return `\`${bot.config.prefix}${this.name + (this.help.arg ? ` <${this.help.arg}>` : "")}\` - *${this.help.description}*`
        }
    }    

    export enum CommandType { 
        Admin, Public
    };
}

import * as Commands from "./commands";
import { type } from "os";
