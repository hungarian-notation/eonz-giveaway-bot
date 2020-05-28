import * as Discord from "discord.js";

import { Personality, PersonalityConfig, Variables } from "./personality";
import { GatekeeperDatabase, DatabaseConfig, Candidate } from "./database";

type ConfigObject = DatabaseConfig & {
    token: string;
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
        this.database = new GatekeeperDatabase(config);
        this.commands = [
            new Commands.RegisterCommand(),

            new Commands.SayCommand(),
            new Commands.AnnounceCommand(),
            new Commands.StatusCommand(),
            new Commands.DrawCommand(),

            new Commands.ResetUsernameCommand(),
            new Commands.ResetIdCommand()
        ];
    }

    async connect() {    
        if (this.client != undefined) {
            return this.client;
        }

        let client = new Discord.Client({ 
            presence: { 
                activity: { type: "WATCHING", name: "the chat and drinking tea." }
            }
        });

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
            this.onConnect();
        })

        return this.client;
    }

    private getCommands(scope: GatekeeperBot.CommandType) {
        return this.commands.filter(each => each.type == scope);
    }

    private async onConnect() {
        let adminCommands
        this.sendControl("help/control-channel", { commands: this.getCommands(GatekeeperBot.CommandType.Admin).map(each => each.getHelp()).join("\n") });
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

    private async send(id: "public" | "control" | "bridge", message: string | string[], options?: Variables) {
        if (!Array.isArray(message)) {
            message = this.personality.get(message, options || {});
        }

        let channel = await this.getTextChannel(this.config.channels[id]);        
        return channel.send({
            content: message.join("\n")
        });
    }

    async sendChat(message: string | string[], options?: Variables) {
        return this.send("public", message, options);
    }

    async sendConsoleCommand(message: string | string[], options?: Variables) {
        return this.send("bridge", message, options);
    }

    async sendControl(message: string | string[], options?: Variables) {
        return this.send("control", message, options);
    }

    async handleCommand(scope: GatekeeperBot.CommandType, message: Discord.Message, command: string, args: string | undefined) {
        let allowed = this.commands.filter(each => each.type == scope);
        let matched = allowed.filter(each => each.name.toLowerCase() == command.toLowerCase())[0];
        
        if (matched) {
            return matched.exec(this, message, command, args);
        } else {
            let validCommands = allowed.map(each => `\`!${each.name}\``).join(", ");
            return message.reply(this.personality.get("help/unknown-command", { command, validCommands }));
        }
    }

    tryCommand(scope: GatekeeperBot.CommandType, message: Discord.Message) {
        const COMMAND_PATTERN   = /^[!]([a-zA-Z-]+)(?: (.*))?$/;
        let matchedCommand      = COMMAND_PATTERN.exec(message.content);
        if (matchedCommand) {        
            let command = matchedCommand[1];
            let args = matchedCommand[2];
            return this.handleCommand(scope, message, command, args);
        } else {
            return undefined;
        }
    }

    async handleDirectMessage(message: Discord.Message) { 
        if (!this.tryCommand(GatekeeperBot.CommandType.Public, message)) {        
            message.reply(this.personality.get("help", { discordUser: message.author.username }));
        }
    }

    private async handleControlMessage(message: Discord.Message) {
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
        
        getHelp(): string {
            return `\`!${this.name + (this.help.arg ? ` <${this.help.arg}>` : "")}\` - *${this.help.description}*`
        }
    }    

    export enum CommandType { 
        Admin, Public
    };
}

import * as Commands from "./commands";