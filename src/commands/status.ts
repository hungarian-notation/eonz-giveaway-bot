import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";
import { Candidate } from "../database";

function candidateToString(candidate: Candidate & { selected?: boolean }) {
    return `*Discord:* **${candidate.discord.username}**, *Minecraft:* **${candidate.minecraft.username}**` + 
        (candidate.selected !== undefined ? `, *Winner?:* **${candidate.selected ? "True" : "False"}**` : "");
}

export class StatusCommand extends GatekeeperBot.Command {

    type = GatekeeperBot.CommandType.Admin;
    name = "status";
    help = { description: "displays the current number of eligible contestants" }


    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        const users = await bot.database.all();
        const candidates = users.filter(each => each.selected == false);
        const winners = users.filter(each => each.selected == true);
        
        await bot.sendControl("admin/status", {
            state: bot.state == GatekeeperBot.State.Active ? "Active" : "Inactive",
            eligible: candidates.length.toFixed(0),
            winners: winners.length.toFixed(0),
            total: users.length.toFixed(0)
        });
    }

}

export class ListCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "list";
    help = { arg: "all|winners", description: "displays the names of the winners, or all engaged users" }

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        const users = await bot.database.all();
        const candidates = users.filter(each => each.selected == false);
        const winners = users.filter(each => each.selected == true);
        
        if (args == "winners") {
            const winnersListing = winners.map(each => candidateToString(each)).join("\n");
            await bot.sendControl("**Winners:**\n" + winnersListing);
        } else if (args == "all") {
            const winnersListing = winners.map(each => candidateToString(each)).join("\n");
            const candidatesListing = candidates.map(each => candidateToString(each)).join("\n");
            await bot.sendControl("**Winners:**\n" + winnersListing + "\n**Candidates:**\n" + candidatesListing);
        }
    }
}