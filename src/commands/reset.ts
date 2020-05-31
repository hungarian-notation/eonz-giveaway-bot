import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";

export class ResetUsernameCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "reset-discord-username";
    help = {
        arg: "discord-username", 
        description: "reset the status of the named discord user"
    };
    
    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        if (!args) {
            await bot.sendControl("missing username")
        } else {
            const result = await bot.database.resetUser({ discord: { username: args }})
            return await bot.sendJson("control", { result: result });
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
    
    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        if (!args) {
            await bot.sendControl("missing user id")
        } else {
            const result = await bot.database.resetUser({ discord: { id: args }})
            return await bot.sendJson("control", { result: result });
        }
    }
}
