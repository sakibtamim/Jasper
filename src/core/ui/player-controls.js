import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function getAutoplayButton(isEnabled) {
    return new ButtonBuilder()
        .setCustomId("toggle_autoplay")
        .setLabel(`Autoplay: ${isEnabled ? "ON" : "OFF"}`)
        .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Secondary);
}

export function createControlButtons(autoplayEnabled) {
    return new ActionRowBuilder().addComponents(
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
        getAutoplayButton(autoplayEnabled)
    );
}
