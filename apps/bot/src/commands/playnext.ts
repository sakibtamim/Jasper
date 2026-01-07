import { createPlayCommand } from "../utils/play-command-factory.js";

export default createPlayCommand(
  "playnext",
  "Add a song to the top of the queue.",
  { position: "next" },
);
