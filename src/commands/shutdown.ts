import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";
import { Candidate } from "../database";

export class ShutdownCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "shutdown";
    help = { description: "causes the bot to shut down gracefully, preventing sqlite database corruption" }

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        await bot.sendControl("admin/shutting-down");
        setTimeout(() => void bot.disconnect(), 1000);
    }
}
