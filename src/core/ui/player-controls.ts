import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function createControlButtons(autoplay: boolean = false): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("pause_resume")
            .setLabel("⏸️ Pause")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("skip")
            .setLabel("⏭️ Skip")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("stop")
            .setLabel("⏹️ Stop")
            .setStyle(ButtonStyle.Danger),
        getAutoplayButton(autoplay)
    );

    return row;
}

export function getAutoplayButton(autoplay: boolean): ButtonBuilder {
    return new ButtonBuilder()
        .setCustomId("toggle_autoplay")
        .setLabel(`Autoplay: ${autoplay ? "ON" : "OFF"}`)
        .setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary);
}
