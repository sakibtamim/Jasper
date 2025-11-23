import playlistCommand from "./playlist.js";
import { createAlias } from "../utils/command-alias.js";

export default createAlias("pl", "Alias for /playlist", playlistCommand);
