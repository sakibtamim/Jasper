import { createPlayCommand } from "../utils/play-command-factory.js";

export default createPlayCommand(
    "playnow",
    "Skip current song and play this immediately.",
    { position: 'next', skipCurrent: true }
);
