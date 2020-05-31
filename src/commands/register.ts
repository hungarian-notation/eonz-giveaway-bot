
import * as Discord from "discord.js";
import { GatekeeperBot } from "../bot";
import { isErrorObject } from "../util";

export class StartCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "start";
    help = {
        description: "causes the bot to start accepting registrations"
    };

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        await bot.setState(GatekeeperBot.State.Active);
    }
}

export class StopCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Admin;
    name = "stop";
    help = {
        description: "causes the bot to stop accepting registrations"
    };

    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        await bot.setState(GatekeeperBot.State.Inactive);
    }
}

export class RegisterCommand extends GatekeeperBot.Command {
    type = GatekeeperBot.CommandType.Public;
    name = "register";
    help = {
        arg: "minecraft username", 
        description: "registers a user"
    };
    
    async exec(bot: GatekeeperBot, message: Discord.Message, command: string, args: string | undefined): Promise<void> {
        if (bot.state == GatekeeperBot.State.Active) {
            if (args) {
                // console.log(`register: discord user: ${message.author.username} minecraft user: ${args}`);

                const registered = await bot.database.isRegistered(message.author);

                try {
                    if (!registered) {
                        await bot.database.register(message.author, args);
                        await message.reply(bot.personality.get("accept", {
                            discordUser:    message.author.username,
                            discordId:      message.author.id,
                            minecraftUser:  args
                        }))
                    } else {
                        await bot.database.register(message.author, args, true);
                        await  message.reply(bot.personality.get("accept/update", {
                            discordUser:    message.author.username,
                            discordId:      message.author.id,
                            minecraftUser:  args
                        }))
                    }
                } catch (e) {
                    if (isErrorObject(e) && e.message == "error/duplicate-username") {
                        await message.reply(bot.personality.get("error/duplicate-username"));
                    }
                }
            } else {
                await message.reply(bot.personality.get("help/missing-username", {
                    discordUser:    message.author.username,
                    discordId:      message.author.id
                }));       
            }
        } else {
            // bot is inactive
            await message.reply(bot.personality.get("reject/inactive"));
        }
    }

}
