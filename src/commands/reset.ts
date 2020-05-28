import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";

export class ResetUsernameCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "reset-discord-username";
    help = {
        arg: "discord-username", 
        description: "reset the status of the named discord user"
    };
    
    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<any> {
        if (!args) {
            bot.sendControl("missing username")
        } else {
            let result = await bot.database.resetUser({ discord: { username: args }})
            return await bot.sendControl(String(JSON.stringify(result) ?? "null"));
        }
    }
}

export class ResetIdCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "reset-discord-id";
    help = {
        arg: "discord-id", 
        description: "reset the status of the discord user with the given id"
    };
    
    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<any> {
        if (!args) {
            bot.sendControl("missing user id")
        } else {
            let result = await bot.database.resetUser({ discord: { id: args }})
            return await bot.sendControl(String(JSON.stringify(result) ?? "null"));
        }
    }
}
