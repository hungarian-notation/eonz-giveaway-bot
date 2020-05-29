# Installation

This bot requires [Node.js](https://nodejs.org/en/)

Once node is installed, you can setup the bot by running:

`npm install -g`

The bot can be launched with:

`npm start`

or 

`eonz-giveaway-bot`

# Configuration

Before starting the bot for the first time, it needs to be configured.

## Required Settings

```json
{
    "token": "<your token here>",

    "channels": {
        "public":   "711311307334877278",
        "control":  "711339846922666065",
        "bridge":   "711369272175493172"
    },

    ...
}  
```

Critically, you must supply it with a discord application token, and the following channel ids:

* `public` - the user-facing channel where the bot will announce the contest and the winners
* `control` - a restricted channel where admins can send the bot commands and trigger drawings
* `bridge` - the minecraft console text channel where the bot can issue whitelist commands

The bot doesn't care if the channels are in the same server, but you will need to authorize the bot on every server it needs access to.

See [these instructions](https://www.writebots.com/discord-bot-token/) for how to generate a token for your instance of the bot and add the bot to your server.

See [support.discord.com](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-) for details on getting a channel id.

## Optional Settings: Prefix

By default, the bot uses `$` as its command prefix. You can change this by adjusting the `prefix` key in `config.json`.

## Optional Settings: Personality

The rest of `config.json` controls the text the bot uses to communicate. You may adjust these to your liking.

```json
    "announce": [
        [
            "Would you like to play a game?",
            "DM me for more information."
        ],

        [
            "Do you have a death wish? Sign up for a chance to join our Minecraft server!",
            "DM me for details!"
        ]
    ],

    "announce/winners": [
        [
            "Our next winners:",
            "{winners}",
            "Check your DMs for instructions if you won."
        ]
    ],
```

Each phrase can have one or more variants, and each of those variants can be split across multiple lines. Here, `announce` has two variants with two lines each, while `announce/winners` has one variant with three lines.

# Operation

## User Commands

The bot only responds to one command via direct message:

* `$register <username>` - Registers the discord user's minecraft username for the contest.

If the user sends anything else the bot will try to help them figure out how to express the command correctly.

## Control Channel Commands

The following control channel commands are supported:

* `$say <message>` - sends a message to the public text channel
* `$announce` - sends the contest announcement to the public text channel
* `$status` - displays the current number of eligible contestants
* `$list <all|winners>` - displays the names of the winners, or all engaged users
* `$draw <count>` - draw a number of winners, announcing it into general chat and sending them the server details
* `$reset-discord-username <discord-username>` - reset the status of the named discord user
* `$reset-discord-id <discord-id>` - Reset the status of the discord user with the given id. This is only needed in the unlikely case where two users have the same user name.