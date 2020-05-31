export interface ConfigObject {
  token:        string;
  channels:     ChannelsConfig;
  db:           string;
  prefix:       string;
  personality:  PersonalityConfig;
}

export interface ChannelsConfig {
  public: string;
  control: string;
  bridge: string;
}

export type PersonalityEntry = string[] | MessageTemplateObject | EmbedMessageTemplate;

export type PersonalityEntryOptions = string | PersonalityEntry | PersonalityEntry[];

export type PersonalityConfig = { [key: string]: PersonalityEntryOptions }

export type MessageTemplateObject = {
    content: string[];
};

export type EmbedMessageTemplate = (MessageTemplateObject & {
    embed: true;
    color?: string;
    title?: string;
    url?: string;
    author?: { 
        name: string,
        icon: string
    },
    image?: string;
    timestamp?: boolean;
});