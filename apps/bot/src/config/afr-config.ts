import { AFR_JASPER_WEIGHT } from './env.js';

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
 * Validated in env.ts to be between 0 and 1.
 */
export const JASPER_WEIGHT = AFR_JASPER_WEIGHT;

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
    '🎧 **{name}** links into the grid — primary swarm node online.',
    '🐈‍⬛ **{name}** — the big black Persian elder — has arrived. Stay respectful.',
    '🖤 The void floof **{name}** slides in, promising stable, no-drama beats.',
    '🏛️ **{name}**, older than Misty herself, takes quiet control of the soundstage.',
    '🔥 **{name}** approves this channel and will now provide industrial-strength music.',
    '🌌 **{name}** materializes from the shadows, syncing the entire feline swarm.',
];

/**
 * HCoF (Heavenly Council of Fur) member entry messages
 */
const HCOF_MESSAGES: EntryMessagePool = {
    Misty: [
        '🌫️ **{name}** emerges from the fog to bless your ears.',
        '☁️ The Grandmistress **{name}** drifts in with serene authority.',
        '🌬️ **{name}**, Keeper of Wisdom, quiets the room with her presence.',
        '👑 **{name}** descends from the Heavenly Council — listen closely.',
    ],

    Tuki: [
        '🕊️ **{name}** arrives — calm, steady, and impossibly patient.',
        '🌟 **{name}** materializes, bringing peace and perfect rhythm.',
        '🔮 The great white giant **{name}** blesses this voice channel.',
        '❄️ **{name}** enters with a soft nod of approval.',
    ],

    Jafraan: [
        '🔥 **{name}** charges in — fearless as ever.',
        '⚔️ **{name}**, the Brave, returns for one more battle tune.',
        '💥 The spirit of **{name}** dives onto the stage!',
        '🩶 **{name}** soars in — small body, enormous courage.',
    ],

    Kalojam: [
        '🍯 **{name}** rolls in causing tiny, adorable chaos.',
        '😼 Mischief levels rising — **{name}** has connected.',
        '⚡ **{name}** zips onto the stage, pure energy incarnate.',
        '🌀 The tiny tornado **{name}** appears!',
    ],

    Chomchom: [
        '🍮 **{name}** waddles in, unbothered and undefeated.',
        '😼 **{name}** has joined — vibes guaranteed.',
        '🎧 **{name}** plugs into the system with maximum confidence.',
        '💫 Survivor spirit detected — **{name}** is here.',
    ],

    Jafreen: [
        '🌈 **{name}** arrives — chosen by Misty, trusted by all.',
        '🎀 **{name}** steps in with quiet grace and bright colors.',
        '🐾 **{name}** takes her place, gentle but steadfast.',
        '💖 **{name}** enters — proof that family is chosen.',
    ],

    Chini: [
        '🌸 **{name}** hops in — renewal and softness embodied.',
        '🌀 **{name}** twirls in with the energy of new beginnings.',
        '🐈‍⬛ **{name}** joins — tail of fate, heart of warmth.',
        '✨ **{name}** appears, echoing past and future together.',
    ],

    Bundle: [
        '🌱 **{name}** compiles the connection… success! (with love)',
        '💚 The tiny spark **{name}** arrives — fragile, but mighty.',
        '🍼 **{name}** squeaks into the voice channel.',
        '💻 **{name}.js** boots up — purrformance optimized.',
    ],

    Shiro: [
        '🍚 **{name}** strolls in — confident, calm, and mildly hungry.',
        '😼 **{name}** appears with effortless swagger and zero urgency.',
        '🛌 **{name}** drifts in like a nap that learned to walk.',
        '✨ **{name}** materializes — lazy elegance, flawless vibes.',
    ],
};

/**
 * Generic fallback messages for unknown/unnamed cats
 */
const GENERIC_MESSAGES = [
    '🎵 **{name}** boots up as an auxiliary node in the Feline Swarm.',
    '🎶 **{name}** has joined the rotation. Please pet responsibly.',
    '🐾 Worker cat **{name}** connects — Jasper signed off on this.',
    '✨ **{name}** sneaks in to handle soundtrack duties.',
    '😺 **{name}** patched into voice. If anything breaks, blame the humans, not the cat.',
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
    if (catName === 'Jasper') {
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
    // We use {name} in all messages now to allow for dynamic renaming if needed
    return message.replace('{name}', catName);
}
