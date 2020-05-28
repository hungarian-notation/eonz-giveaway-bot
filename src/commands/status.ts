import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";

export class StatusCommand extends GatekeeperBot.Command {

    type = GatekeeperBot.CommandType.Admin;
    name = "status";
    help = { description: "displays the current number of eligible contestants" }

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<any> {
        let candidates = await bot.database.getCandidates();
        
        if (args == "verbose") {
            let listing = candidates.map(each => `${each.minecraft.username} (${each.discord.username})`).join("\n");
            bot.sendControl("**Candidates:**\n" + listing);
        } else {
            bot.sendControl("admin/status", {
                eligible: candidates.length.toFixed(0)
            });
        }
    }

}