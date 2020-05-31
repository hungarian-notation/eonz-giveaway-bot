import { default as format } from "string-template";

import * as path from "path";
import * as Discord from "discord.js";
import { logger } from "./logger";
import chalk from "chalk";
import { PersonalityEntryOptions, MessageTemplateObject, EmbedMessageTemplate, PersonalityConfig } from "./config";

export type Variables = { [key: string]: string };

export function isStringArray(value: unknown): value is string[] {
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; ++i) {
            if (typeof value[i] != "string") {
                return false;
            }
        }
        return false;
    } else {
        return false;
    }
}

function normalize(entry: PersonalityEntryOptions): (MessageTemplateObject | EmbedMessageTemplate)[] {
    if (typeof entry == "string") {
        entry = [ [ entry ] ];
    }

    if (isStringArray(entry)) {
        entry = { content: entry };
    }

    let normalized: (MessageTemplateObject | EmbedMessageTemplate)[];

    if (!Array.isArray(entry)) {
        normalized = [ entry ] as (MessageTemplateObject | EmbedMessageTemplate)[];
    } else {
        normalized = entry.map(each => {
            if (Array.isArray(each)) {
                return { content: each };
            } else {
                return each;
            }
        });
    }

    return normalized;
}

export class Personality {
    config: PersonalityConfig
    defaults: Variables;

    constructor(config: PersonalityConfig) {
        this.config     = config;
        this.defaults   = {};
    }

    get(id: string): string;
    get(id: string, values: Variables): string;
    get(id: string, values: Variables, simple: true): string;
    get(id: string, values: Variables, simple: false): string | Discord.MessageEmbed;
    get(id: string, values?: Variables, simple = true): string | Discord.MessageEmbed {
        values = Object.assign({}, this.defaults, values);

        logger.verbose(`expanding: ${id}`);

        const entry = normalize(this.config[id] ?? id);
        const selected: MessageTemplateObject | EmbedMessageTemplate = entry[Math.floor(Math.random() * entry.length)];

        logger.verbose(`selected:`);
        logger.verbose(entry);
        logger.verbose(`values:`);
        logger.verbose(values);
        

        function compile(input: string | string[]) {
            if (!Array.isArray(input)) {
                input = [ input ];
            }

            return input.map(each => {
                if (typeof each !== "string") {
                    console.error(each);
                    throw new Error(`non string value was passed to formatter, see prior error console entry for details`);
                }

                logger.verbose(`formatting: ` + chalk.gray(each));

                return format(each, values);
            }).join("\n");
        }

        if (simple || Array.isArray(selected) || typeof selected == "string" || !("embed" in selected)) {
            return compile(selected.content);
        } else {
            let message = new Discord.MessageEmbed();

            if (selected.color) {
                message = message.setColor(selected.color);
            } 

            if (selected.title) {
                message = message.setTitle(compile(selected.title));
            } 

            message = message.setDescription(compile(selected.content));

            if (selected.url) {
                message = message.setURL(compile(selected.url));
            } 

            if (selected.author) {
                if (selected.author.icon.startsWith("http")) {
                    message = message.setAuthor(compile(selected.author.name), selected.author.icon);
                } else {            
                    const iconPath = path.normalize(selected.author.icon);
                    const iconName = path.basename(iconPath);
                    message = message.setAuthor(compile(selected.author.name), `attachment://${iconName}`);
                    message = message.attachFiles([ iconPath ]);
                }
            } 

            if (selected.timestamp) {
                message = message.setTimestamp();
            }

            return message;
        }
    }
}