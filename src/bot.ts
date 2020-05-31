import * as Discord from "discord.js";

import { ConfigObject, PersonalityConfig } from "./config";
import { Personality, Variables } from "./personality";
import { GatekeeperDatabase, DatabaseConfig, Candidate } from "./database";
import { logger } from "./logger";
import chalk from "chalk";
import { ErrorObject, RecursivePartial, defined, explain, GenericRecord } from "./util";

export class GatekeeperBot {
    client?:                Promise<Discord.Client>;
    config:                 ConfigObject;
    personality:            Personality;
    database:               GatekeeperDatabase;
    commands:               GatekeeperBot.Command[];
    ondisconnect?:           () => void;


    private connected?:     Promise<void>;

    private _state: GatekeeperBot.State;

    constructor(config: RecursivePartial<ConfigObject>) {
        this.config = {
            token: explain("config.token").defined(config.token),
            channels: {
                bridge:     explain("config.channels.bridge").defined(config.channels?.bridge),
                control:    explain("config.channels.control").defined(config.channels?.control),
                public:     explain("config.channels.public").defined(config.channels?.public),
            },
            db: config.db ?? "./db.sqlite",
            prefix: config.prefix ?? "$",
            personality: (config.personality as PersonalityConfig) ?? {}
        };
        
        this._state = GatekeeperBot.State.Inactive;
        this.personality = new Personality(this.config.personality);
        this.personality.defaults.prefix = this.config.prefix;        
        this.database = new GatekeeperDatabase(this.config);
        this.commands = [
            new Commands.RegisterCommand(),

            new Commands.StartCommand(),
            new Commands.StopCommand(),
            new Commands.SayCommand(),
            new Commands.AnnounceCommand(),
            new Commands.StatusCommand(),
            new Commands.ListCommand(),
            new Commands.DrawCommand(),
            new Commands.ResetUsernameCommand(),
            new Commands.ResetIdCommand(),

            new Commands.ShutdownCommand()
        ];
    }

    get state(): GatekeeperBot.State {
        return this._state;
    }

    setState(state: GatekeeperBot.State): Promise<void> {
        if (state != this._state) {
            this._state = state;

            if (state == GatekeeperBot.State.Active) {
                // activating
                return this.sendControl("admin/starting");
            } else {
                return this.sendControl("admin/stopping");
            }
        } else {
            return Promise.resolve();
        }
    }

    async connect(): Promise<Discord.Client> {    
        
        if (this.client != undefined) {
            return this.client;
        }

        logger.log(`connecting...`);

        const client = new Discord.Client();

        this.client = new Promise((resolve, reject) => {
            client.login(this.config.token).then(() => resolve(client), (e) => reject(e));         

            client.on("message", message => {
                if (message.author.bot) {
                    return;
                }

                this.handleMessage(message).catch(e => this.error(e, true));
            });
        });
        
        await this.client.then(async () => {            
            const username = client.user?.username ?? "(undefined username)";
            const id = client.user?.id ?? "(undefined id)";

            logger.log(`connected as: ${username}#${client.user?.discriminator ?? "????"}`);

            this.personality.defaults["client_username"] = username;
            this.personality.defaults["client_id"] = id;

            await this.onConnect();
        })

        return this.client;
    }

    async disconnect(force = true): Promise<void> {
        (await this.connect()).destroy();

        try {
            await this.database.close();
        } catch (e) {
            if (force) {
                console.error(chalk.redBright(`sqlite complained about being closed:`))
                console.error(e);
            } else {
                throw e;
            }
        }

        if (this.ondisconnect) 
            this.ondisconnect();
    }

    private getCommands(scope: GatekeeperBot.CommandType) {
        return this.commands.filter(each => each.type == scope);
    }

    private async onConnect(): Promise<void> {
        await this.sendControl("help/control-channel", {
            commands: this.getCommands(GatekeeperBot.CommandType.Admin).map(each => each.getHelp(this)).join("\n") 
        });
    }

    private async handleMessage(message: Discord.Message): Promise<void> {
        if (message.channel.type == "dm") {
            // in dm
            await this.handleDirectMessage(message);
        } else if (message.channel.id == this.config.channels.control) {
            await this.handleControlMessage(message);
        }
    }

    private async getTextChannel(id: string): Promise<Discord.TextChannel> {
        const client  = await this.connect();
        const channel = await (client.channels.cache.get(id) || client.channels.fetch(id));

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

        const channel = await this.getTextChannel(this.config.channels[id]);      

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

    async sendJson(id: "public" | "control" | "bridge", json: unknown): Promise<void> {
        const message = "```json\n" + JSON.stringify(json, null, '\t') + "\n```";
        await this.send(id, message);        
    }

    async sendChat(message: string, options?: Variables): Promise<void> {
        await this.send("public", message, options);
    }

    async sendConsoleCommand(message: string, options?: Variables): Promise<void> {
        await this.send("bridge", message, options);
    }

    async sendControl(message: string, options?: Variables): Promise<void> {
        await this.send("control", message, options);
    }
    

    async handleCommand(scope: GatekeeperBot.CommandType, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        const allowed = this.commands.filter(each => each.type == scope);
        const matched = allowed.filter(each => each.name.toLowerCase() == command.toLowerCase())[0];
        
        try {
            if (matched) {
                await matched.exec(this, message, command, args);
            } else {
                const validCommands = allowed.map(each => `\`${this.config.prefix}${each.name}\``).join(", ");
                await message.reply(this.personality.get("help/unknown-command", { command, validCommands }));
            }
        } catch (e) {
            await this.error(e, true);
        }
    }

    async tryCommand(scope: GatekeeperBot.CommandType, message: Discord.Message): Promise<boolean> {
        const COMMAND_PATTERN   = /^([a-zA-Z-]+)(?: (.*))?$/;

        const prefixed = message.content.startsWith(this.config.prefix) ? message.content.slice(this.config.prefix.length) : undefined;
        const matchedCommand = prefixed ? COMMAND_PATTERN.exec(prefixed) : undefined;

        if (matchedCommand) {        
            const command = matchedCommand[1];
            const args = matchedCommand[2];

            try {
                await this.handleCommand(scope, message, command, args);
            } catch(e) {
                await this.error(e, true);
            }    

            return true;
        } else {
            return false;
        }
    }

    async handleDirectMessage(message: Discord.Message): Promise<void> { 
        try {
            logger.verbose(chalk.blueBright(`direct message: `) + `${message.author.username}: ${message.content}`);
            if (!(await this.tryCommand(GatekeeperBot.CommandType.Public, message))) {        
                await message.reply(this.personality.get("help", { discordUser: message.author.username }));
            }
        } catch (e) {
            await this.error(e, true);
        }
    }

    private async handleControlMessage(message: Discord.Message) {
        logger.verbose(chalk.greenBright(`control message: `) + `${message.author.username}: ${message.content}`);
        await this.tryCommand(GatekeeperBot.CommandType.Admin, message);
    }

    async giveRewardsTo(candidate: Candidate): Promise<void> {
        await this.sendConsoleCommand("minecraft/whitelist", { minecraftUser: candidate.minecraft.username })

        const client = await this.connect();
        const user = await client.users.fetch(candidate.discord.id);

        await user.send(this.personality.get("win", { 
            discordUser: candidate.discord.username, 
            minecraftUser: candidate.minecraft.username 
        }));
    }

    private _errorState: boolean = false;

    async error(e: ErrorObject, recoverable: boolean): Promise<void> {
        const message = new Discord.MessageEmbed()
            .setTimestamp()
            .setTitle(`Error (${recoverable ? "Non Fatal" : "Fatal"})`)
            .addField("name", e.name)
            .addField("message", e.message);

        message.type

        if (e.code) {
            message.addField("code", e.code);
        }

        if (e.stack) {
            message.addField("stack", "```\n" + e.stack + "\n```");
        }

        message.setDescription("@here\nAn error occurred." + (recoverable ? "The error was non-fatal." : "This is a fatal error. I will now attempt to shut down."));

        if (this._errorState) {
            console.error("recursive invocation of GatekeeperBot#error()");
            console.error(e);
            process.exit(1);
        } else {
            this._errorState = true;
            await this.send("control", message);    
            this._errorState = false;
        }
    }
}



// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GatekeeperBot {

    export abstract class Command {
        abstract get type(): CommandType;
        abstract get name(): string;
        abstract get help(): { arg?: string, description: string };
        abstract exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void>;
        
        getHelp(bot: GatekeeperBot): string {
            return `\`${bot.config.prefix}${this.name + (this.help.arg ? ` <${this.help.arg}>` : "")}\` - *${this.help.description}*`
        }
    }    

    export enum CommandType { 
        Admin, Public
    }

    export enum State {
        Inactive = 0, Active = 1
    }
}

import * as Commands from "./commands";