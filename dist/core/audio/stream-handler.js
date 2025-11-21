import { spawn } from "child_process";
import { findYtDlpPath } from "../../utils/yt-dlp-helper.js";
import logger from "../logger.js";
// Helper: Get the path to the local yt-dlp.exe
export function getYtDlpPath() {
    const path = findYtDlpPath();
    if (path)
        return path;
    // If nothing was found, throw an informative error
    throw new Error("yt-dlp not found. Please install yt-dlp and ensure it is on your PATH, or add a static yt-dlp binary next to the app.");
}
export function isUrl(text) {
    return text.includes("youtube.com") || text.includes("youtu.be");
}
export function fetchVideoData(url) {
    return new Promise((resolve, reject) => {
        const ytDlpPath = getYtDlpPath();
        // -J: Dump JSON metadata
        const args = ["-J", url];
        const process = spawn(ytDlpPath, args);
        let data = "";
        let error = "";
        process.stdout.on("data", (chunk) => (data += chunk));
        process.stderr.on("data", (chunk) => (error += chunk));
        process.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp failed: ${error}`));
            }
            else {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                }
                catch (err) {
                    reject(new Error("Failed to parse video JSON"));
                }
            }
        });
    });
}
export function fetchPlaylistData(url) {
    return new Promise((resolve, reject) => {
        const ytDlpPath = getYtDlpPath();
        const args = ["--flat-playlist", "-J", url];
        const process = spawn(ytDlpPath, args);
        let data = "";
        let error = "";
        process.stdout.on("data", (chunk) => (data += chunk));
        process.stderr.on("data", (chunk) => (error += chunk));
        process.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp failed: ${error}`));
            }
            else {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                }
                catch (err) {
                    reject(new Error("Failed to parse playlist JSON"));
                }
            }
        });
    });
}
export function createStreamProcess(url) {
    const ytDlpPath = getYtDlpPath();
    const args = ["-f", "bestaudio", "-o", "-", "-q", url];
    const process = spawn(ytDlpPath, args);
    process.on("error", (err) => {
        logger.error(`Failed to spawn yt-dlp: ${err.message}`);
    });
    return process;
}
