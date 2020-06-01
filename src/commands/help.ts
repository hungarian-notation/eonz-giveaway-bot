import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";
import { Candidate } from "../database";

export class HelpCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "help";
    help = { description: "displays the command list in the control text channel" }

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        await bot.sendHelp();
    }
}