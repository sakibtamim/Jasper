import dotenv from "dotenv";
dotenv.config();

/**
 * AFR (Automatic Feline Rotation) Configuration
 * 
 * This module centralizes configuration for the AFR system, including:
 * - Jasper's selection weight (probability)
 * - Entry messages for all cats (Jasper, HCoF members, and generic fallbacks)
 */

// ============================================================================
// AFR Selection Weight Configuration
// ============================================================================

/**
 * Jasper's selection weight when eligible.
 * 
 * - 0.5 (default): Jasper has a 50% chance of being selected
 * - 1.0: Jasper is always selected when eligible (legacy behavior)
 * - 0.0: Jasper is never selected when other workers are available
 * 
 * Configurable via AFR_JASPER_WEIGHT environment variable.
 */
const rawJasperWeight = process.env.AFR_JASPER_WEIGHT || "0.5";
export const JASPER_WEIGHT = parseFloat(rawJasperWeight);

// Validate weight is in valid range [0, 1]
if (JASPER_WEIGHT < 0 || JASPER_WEIGHT > 1 || isNaN(JASPER_WEIGHT)) {
    throw new Error(
        `AFR_JASPER_WEIGHT must be between 0 and 1, but received invalid value: "${rawJasperWeight}"`
    );
}

// ============================================================================
// Entry Messages Configuration
// ============================================================================

/**
 * Entry message pools for each cat.
 * 
 * Each cat can have multiple entry messages. When a cat connects to a voice
 * channel, one message is randomly selected from their pool.
 */

type EntryMessagePool = {
    [catName: string]: string[];
};

/**
 * Jasper's entry messages (main controller bot)
 */
const JASPER_MESSAGES = [
    "🎧 **Jasper** links into the grid — primary swarm node online.",
    "🐈‍⬛ **Jasper** — the big black Persian elder — has arrived. Stay respectful.",
    "🖤 The void floof **Jasper** slides in, promising stable, no-drama beats.",
    "🏛️ **Jasper**, older than Misty herself, takes quiet control of the soundstage.",
    "🔥 **Jasper** approves this channel and will now provide industrial-strength music.",
    "🌌 **Jasper** materializes from the shadows, syncing the entire feline swarm.",
];

/**
 * HCoF (Heavenly Council of Fur) member entry messages
 */
const HCOF_MESSAGES: EntryMessagePool = {
    Misty: [
        "🌫️ **Misty** emerges from the fog to bless your ears.",
        "☁️ The Grandmistress **Misty** drifts in with serene authority.",
        "🌬️ **Misty**, Keeper of Wisdom, quiets the room with her presence.",
        "👑 **Misty** descends from the Heavenly Council — listen closely.",
    ],

    Tuki: [
        "🕊️ **Tuki** arrives — calm, steady, and impossibly patient.",
        "🌟 **Tuki** materializes, bringing peace and perfect rhythm.",
        "🔮 The great white giant **Tuki** blesses this voice channel.",
        "❄️ **Tuki** enters with a soft nod of approval.",
    ],

    Jafraan: [
        "🔥 **Jafraan** charges in — fearless as ever.",
        "⚔️ **Jafraan**, the Brave, returns for one more battle tune.",
        "💥 The spirit of **Jafraan** dives onto the stage!",
        "🩶 **Jafraan** soars in — small body, enormous courage.",
    ],

    Kalojam: [
        "🍯 **Kalojam** rolls in causing tiny, adorable chaos.",
        "😼 Mischief levels rising — **Kalojam** has connected.",
        "⚡ **Kalojam** zips onto the stage, pure energy incarnate.",
        "🌀 The tiny tornado **Kalojam** appears!",
    ],

    Chomchom: [
        "🍮 **Chomchom** waddles in, unbothered and undefeated.",
        "😼 **Chomchom** has joined — vibes guaranteed.",
        "🎧 **Chomchom** plugs into the system with maximum confidence.",
        "💫 Survivor spirit detected — **Chomchom** is here.",
    ],

    Jafreen: [
        "🌈 **Jafreen** arrives — chosen by Misty, trusted by all.",
        "🎀 **Jafreen** steps in with quiet grace and bright colors.",
        "🐾 **Jafreen** takes her place, gentle but steadfast.",
        "💖 **Jafreen** enters — proof that family is chosen.",
    ],

    Chini: [
        "🌸 **Chini** hops in — renewal and softness embodied.",
        "🌀 **Chini** twirls in with the energy of new beginnings.",
        "🐈‍⬛ **Chini** joins — tail of fate, heart of warmth.",
        "✨ **Chini** appears, echoing past and future together.",
    ],

    Bundle: [
        "🌱 **Bundle** compiles the connection… success! (with love)",
        "💚 The tiny spark **Bundle** arrives — fragile, but mighty.",
        "🍼 **Bundle** squeaks into the voice channel.",
        "💻 **Bundle.js** boots up — purrformance optimized.",
    ],
};


/**
 * Generic fallback messages for unknown/unnamed cats
 */
const GENERIC_MESSAGES = [
    "🎵 **{name}** boots up as an auxiliary node in the Feline Swarm.",
    "🎶 **{name}** has joined the rotation. Please pet responsibly.",
    "🐾 Worker cat **{name}** connects — Jasper signed off on this.",
    "✨ **{name}** sneaks in to handle soundtrack duties.",
    "😺 **{name}** patched into voice. If anything breaks, blame the humans, not the cat.",
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Get a random entry message for a specific cat.
 * 
 * Selection priority:
 * 1. Jasper gets Jasper-specific messages
 * 2. Known HCoF members get their specific messages
 * 3. Others get generic messages with their name interpolated
 * 
 * @param catName - The name of the cat (e.g., "Jasper", "Misty", "Unknown Bot")
 * @returns A random entry message for the cat
 */
export function getEntryMessage(catName: string): string {
    let pool: string[];

    // Priority 1: Jasper
    if (catName === "Jasper") {
        pool = JASPER_MESSAGES;
    }
    // Priority 2: Known HCoF members
    else if (catName in HCOF_MESSAGES) {
        pool = HCOF_MESSAGES[catName];
    }
    // Priority 3: Generic fallback
    else {
        pool = GENERIC_MESSAGES;
    }

    // Select random message from pool
    const randomIndex = Math.floor(Math.random() * pool.length);
    const message = pool[randomIndex];

    // Interpolate {name} placeholder (safe to run on all messages)
    return message.replace("{name}", catName);
}
