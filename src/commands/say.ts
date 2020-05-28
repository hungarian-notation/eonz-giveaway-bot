import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";

export class SayCommand extends GatekeeperBot.Command {

    type = GatekeeperBot.CommandType.Admin;
    name = "say";
    help = { arg: "message", description: "sends a message to the public text channel" }

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<any> {
        if (args) {
            await bot.sendChat(args);
            bot.sendControl("message sent.");
        }
    }
}

export class AnnounceCommand extends GatekeeperBot.Command {

    type = GatekeeperBot.CommandType.Admin;
    name = "announce";
    help = { description: "sends the contest announcement to the public text channel" }

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<any> {
        await bot.sendChat("announce");
        bot.sendControl("announcement sent.");
    }
}