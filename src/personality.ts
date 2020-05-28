import { default as format } from "string-template";

export type Variables = { [key: string]: string };
export type PersonalityConfig = { [key: string]: ( string | (string|string[])[] ) }

export class Personality {
    config: PersonalityConfig

    constructor(config: PersonalityConfig) {
        this.config = config;
    }

    get(id: string, values: Variables) {
        let template = this.config[id] || id;

        if (!Array.isArray(template)) {
            template = [ template ];
        }

        let selected = template[Math.floor(Math.random() * template.length)];

        if (!Array.isArray(selected)) {
            selected = [ selected ];
        }

        let compiled = selected.map(each => format(each, values));

        return compiled;
    }
}