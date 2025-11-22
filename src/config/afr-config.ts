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
    "🐾 **Jasper** has arrived, ready to drop some purrfect beats!",
    "😺 **Jasper** gracefully enters the stage!",
    "🎵 The legendary **Jasper** appears to bless your ears!",
    "🐈‍⬛ **Jasper**, the big black Persian, is here to make it meow-gical!",
    "✨ **Jasper** emerges from the shadows, ready to rock!",
];

/**
 * HCoF (Heavenly Council of Fur) member entry messages
 */
const HCOF_MESSAGES: EntryMessagePool = {
    Misty: [
        "🌫️ **Misty** emerges from the fog to bless your ears!",
        "☁️ **Misty** drifts in on a cloud of pure vibes!",
        "🌬️ The ethereal **Misty** has arrived!",
    ],
    Tuki: [
        "🔮 **Tuki** arrives with mystical melodies!",
        "✨ **Tuki** materializes to share the magic!",
        "🌟 The enigmatic **Tuki** graces your presence!",
    ],
    Jafreen: [
        "🎭 **Jafreen** takes the stage!",
        "🎪 **Jafreen** brings the show to you!",
        "🌈 The vibrant **Jafreen** is ready to perform!",
    ],
};

/**
 * Generic fallback messages for unknown/unnamed cats
 */
const GENERIC_MESSAGES = [
    "🎵 **{name}** is here to make some noise!",
    "🎶 **{name}** has joined the party!",
    "🐾 **{name}** arrives ready to jam!",
    "✨ **{name}** is here to bring the beats!",
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

    // Interpolate {name} placeholder for generic messages only
    return pool === GENERIC_MESSAGES ? message.replace("{name}", catName) : message;
}
