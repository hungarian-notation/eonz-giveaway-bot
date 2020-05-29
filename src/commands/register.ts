import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";

export class RegisterCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Public;
    name = "register";
    help = {
        arg: "minecraft username", 
        description: "registers a user"
    };
    
    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<any> {
        if (args) {
            // console.log(`register: discord user: ${message.author.username} minecraft user: ${args}`);

            let registered = await bot.database.isRegistered(message.author);

            if (!registered) {
                await bot.database.register(message.author, args);

                message.reply(bot.personality.get("accept", {
                    discordUser:    message.author.username,
                    discordId:      message.author.id,
                    minecraftUser:  args
                }))
            } else {
                await bot.database.register(message.author, args);

                message.reply(bot.personality.get("accept/update", {
                    discordUser:    message.author.username,
                    discordId:      message.author.id,
                    minecraftUser:  args
                }))
            }
        } else {
            message.reply(bot.personality.get("help/missing-username", { discordUser: message.author.username }));       
        }
    }

}
