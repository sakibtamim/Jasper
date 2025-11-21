import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
export function createControlButtons(autoplay = false) {
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("pause_resume")
        .setLabel("⏸️ Pause")
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId("skip")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Primary), new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("⏹️ Stop")
        .setStyle(ButtonStyle.Danger), new ButtonBuilder()
        .setCustomId("toggle_autoplay")
        .setLabel(`🔄 Autoplay: ${autoplay ? "ON" : "OFF"}`)
        .setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary));
    return row;
}
export function getAutoplayButton(autoplay) {
    return new ButtonBuilder()
        .setCustomId("toggle_autoplay")
        .setLabel(`🔄 Autoplay: ${autoplay ? "ON" : "OFF"}`)
        .setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary);
}
