import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";

export class DrawCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "draw";
    help = {
        arg: "count", 
        description: "draw a number of winners, announcing it into general chat and sending them the server details"
    };
    
    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        const candidates = await bot.database.candidates();
        let count = Math.max(Number(args ?? "1"));        

        if (isNaN(count) || count < 0) {
            count = 1;
        }
        
        if (count > candidates.length) {
            count = candidates.length;
        }

        if (count > 0) {
            await bot.sendControl(`drawing ${count} winners from ${candidates.length} candidates...`);

            const winners         = await bot.database.selectWinners(count);
            
            const winnersText     = winners.map(each => bot.personality.get("announce/winners/name", {
                discordUser:    each.discord.username,
                discordId:      each.discord.id,
                minecraftUser:  each.minecraft.username
            })).join("\n");

            const controlText     = winners.map(each => bot.personality.get("name/control", {
                discordUser:    each.discord.username,
                discordId:      each.discord.id,
                minecraftUser:  each.minecraft.username
            })).join("\n");

            await bot.sendChat("announce/winners", { 
                winners: winnersText
            });

            await bot.sendControl(controlText);

            for (let i = 0; i < winners.length; ++i) {
                const next = winners[i];                
                await bot.giveRewardsTo(next);
            }
        } else {
            await bot.sendControl(`no candidates available`);
        }
    }
}
