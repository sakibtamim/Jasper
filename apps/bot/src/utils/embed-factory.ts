import { EmbedBuilder } from 'discord.js';

import config from '../config/config.js';

const { botName, color, accentColor } = config;

export function baseEmbed(): EmbedBuilder {
    return new EmbedBuilder().setColor(color).setFooter({ text: botName });
}

export function helpEmbed(): EmbedBuilder {
    return baseEmbed()
        .setTitle('Jasper Help')
        .setDescription("Meow! I'm Jasper, your fluffy music companion. Here are my main commands:")
        .addFields(
            { name: '/play <query>', value: 'Play a YouTube URL or search keyword.' },
            { name: '/pause', value: 'Pause the current track.' },
            { name: '/resume', value: 'Resume the paused track.' },
            { name: '/skip', value: 'Skip the current track.' },
            { name: '/stop', value: 'Stop playback and clear the queue.' },
            { name: '/queue', value: 'Show the current music queue.' },
            { name: '/nowplaying', value: "Show what's currently playing." },
        )
        .setColor(accentColor);
}

/**
 * Create a compact embed for when a song is added to queue
 */
export function songAddedEmbed(
    title: string,
    url: string,
    thumbnail: string | undefined,
    workerName: string,
    devPrefix: string,
): EmbedBuilder {
    return baseEmbed()
        .setTitle(`${devPrefix}✅ Added to queue`)
        .setDescription(`[${title}](${url})`)
        .setThumbnail(thumbnail || null)
        .setFooter({ text: `${botName} • ${workerName}` });
}

/**
 * Create a compact embed for now playing
 */
export function nowPlayingEmbed(
    title: string,
    url: string,
    thumbnail: string | undefined,
    workerName: string,
    devPrefix: string,
): EmbedBuilder {
    return baseEmbed()
        .setTitle(`${devPrefix}▶️ Now Playing`)
        .setDescription(`[${title}](${url})`)
        .setThumbnail(thumbnail || null)
        .setFooter({ text: `${botName} • ${workerName}` });
}

/**
 * Create a compact embed for radio mode
 */
export function radioEmbed(
    title: string,
    url: string,
    thumbnail: string | undefined,
    botName: string,
    devPrefix: string,
): EmbedBuilder {
    return baseEmbed()
        .setTitle(`${devPrefix}📻 Radio Mode`)
        .setDescription(`[${title}](${url})`)
        .setThumbnail(thumbnail || null)
        .setFooter({ text: `Enqueued by Radio ${botName} 📻` });
}

export default {
    baseEmbed,
    helpEmbed,
    songAddedEmbed,
    nowPlayingEmbed,
    radioEmbed,
};
