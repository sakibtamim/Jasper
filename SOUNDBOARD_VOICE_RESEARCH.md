# Discord.js Voice Connection Architecture Research

## Executive Summary

**Finding:** Discord.js `VoiceConnection` can only be subscribed to **ONE** `AudioPlayer` at a time. When you subscribe a new player, it **replaces** the previous subscription, stopping the first player's audio transmission.

**Current Behavior:** Music stops when soundboard plays because the connection switches from music player to temp player.

**TimeoutNegativeWarning:** This warning appears because somewhere in the code a `setTimeout` is being called with a negative duration (likely from `duration - elapsed_time` calculation).

## Discord.js Voice Architecture

### Core Components

1. **VoiceConnection**
   - One per voice channel
   - Handles the WebSocket connection to Discord
   - Can only transmit audio from ONE AudioPlayer at a time
   - Calling `connection.subscribe(newPlayer)` **replaces** the previous subscription

2. **AudioPlayer**
   - Manages playback state for a single audio resource
   - Emits lifecycle events (Playing, Paused, Idle)
   - Can only play one resource at a time
   - Multiple players can exist, but only one can be subscribed to a connection

3. **AudioResource**
   - Represents an audio stream/file
   - Requires Opus encoding before transmission to Discord

### Why Our Separate Player Approach Failed

```typescript
existingQueue.connection.subscribe(tempPlayer); ← Replaces main player subscription!
```

**What Happens:**

1. Main player is subscribed, playing music
2. We call `connection.subscribe(tempPlayer)`
3. **Discord.js unsubscribes the main player**
4. Temp player is now subscribed, plays soundboard
5. Main player's audio stops transmitting to Discord
6. Soundboard finishes, temp player goes idle
7. Main player is still "playing" internally but not subscribed
8. Music never resumes transmission

## Solution Options

### Option 1: Pause/Resume with Player Switching (Recommended)

**Complexity:** Low  
**Audio Quality:** Good  
**User Experience:** Interrupts music briefly

```typescript
if (existingQueue) {
    // 1. Pause main player
    const wasPlaying = existingQueue.player.state.status === AudioPlayerStatus.Playing;
    if (wasPlaying) {
        existingQueue.player.pause();
    }

    // 2. Create temp player
    const tempPlayer = createAudioPlayer({...});

    // 3. Switch subscription (main player → temp player)
    existingQueue.connection.subscribe(tempPlayer);

    // 4. Play soundboard
    tempPlayer.play(soundboardResource);

    // 5. On soundboard finish: switch back and resume
    tempPlayer.once('idle', () => {
        existingQueue.connection.subscribe(existingQueue.player); // Re-subscribe main
        if (wasPlaying) {
            existingQueue.player.unpause(); // Resume playback
        }
        tempPlayer.stop();
    });
}
```

**Pros:**

- Clean architecture
- No complex mixing required
- Reliable state management
- Works with all audio formats

**Cons:**

- Brief silence during player switch (~50-100ms)
- Music pauses completely

---

### Option 2: Real-time Audio Mixing with FFmpeg

**Complexity:** High  
**Audio Quality:** Excellent  
**User Experience:** True simultaneous playback

**Approach:** Mix music + soundboard streams in real-time using FFmpeg, output single stream to one player.

```typescript
if (existingQueue) {
  // 1. Get current music stream
  const musicStream = getCurrentMusicStream(existingQueue);

  // 2. Create soundboard stream
  const soundboardStream = fs.createReadStream(audioPath);

  // 3. Mix streams using FFmpeg
  const mixedStream = ffmpeg()
    .input(musicStream)
    .input(soundboardStream)
    .complexFilter([
      "[0:a]volume=0.7[music]", // Lower music volume
      "[1:a]volume=1.0[sfx]", // Full soundboard volume
      "[music][sfx]amix=inputs=2[out]", // Mix together
    ])
    .map("[out]")
    .audioCodec("libopus")
    .format("opus")
    .pipe();

  // 4. Replace current resource with mixed stream
  const mixedResource = createAudioResource(mixedStream, {
    inputType: StreamType.OggOpus,
  });
  existingQueue.player.play(mixedResource);
}
```

**Pros:**

- True simultaneous playback
- Professional soundboard behavior
- Can adjust relative volumes
- No interruption to music

**Cons:**

- Very complex implementation
- Requires managing music stream state
- High CPU usage for real-time mixing
- Potential latency issues
- Need to handle stream seek positions
- Can't easily resume original music stream after mix

---

### Option 3: Store and Resume Position (Advanced Pause/Resume)

**Complexity:** Medium-High  
**Audio Quality:** Good  
**User Experience:** Seamless resume

**Approach:** Track playback position, pause, play soundboard, then resume from exact position.

```typescript
if (existingQueue) {
    // 1. Store current playback state
    const currentResource = existingQueue.player.state.resource;
    const playbackPosition = currentResource?.playbackDuration || 0;
    const currentSong = existingQueue.nowPlaying;

    // 2. Pause and switch to temp player
    existingQueue.player.pause();
    const tempPlayer = createAudioPlayer({...});
    existingQueue.connection.subscribe(tempPlayer);

    // 3. Play soundboard
    tempPlayer.play(soundboardResource);

    // 4. On finish: recreate resource at exact position
    tempPlayer.once('idle', () => {
        // Recreate stream with seek to playback position
        const resumeStream = createStreamWithSeek(currentSong, playbackPosition);
        const resumeResource = createAudioResource(resumeStream);

        // Switch back
        existingQueue.connection.subscribe(existingQueue.player);
        existingQueue.player.play(resumeResource);
    });
}
```

**Pros:**

- Music resumes from exact position
- Professional UX
- Minimal disruption

**Cons:**

- Complex stream seeking logic
- Doesn't work with all stream types (live, HLS, etc.)
- Requires yt-dlp seek support
- Edge cases with cached vs. live streams

---

## Recommended Implementation: Option 1

**Rationale:**

- **Simple:** Minimal code changes, reuses existing patterns
- **Reliable:** Well-tested pattern in Discord.js community
- **Maintainable:** Clear state transitions, easy to debug
- **Performant:** No FFmpeg overhead, no complex stream management

**Implementation Plan:**

### 1. Core Changes (`plugin-manager.ts`)

```typescript
if (existingQueue) {
  // Pause main player if playing
  const wasPlaying =
    existingQueue.player.state.status === AudioPlayerStatus.Playing;
  if (wasPlaying) {
    existingQueue.player.pause();
    logger.info("[plugins] Paused music for soundboard");
  }

  // Create and subscribe temp player
  const tempPlayer = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
  });
  existingQueue.connection.subscribe(tempPlayer); // Switch subscription

  // Play soundboard
  const resource = createAudioResource(fs.createReadStream(audioPath), {
    inputType: StreamType.Arbitrary,
  });
  tempPlayer.play(resource);

  // On soundboard finish: restore main player
  tempPlayer.once("idle", () => {
    // Re-subscribe main player
    existingQueue.connection.subscribe(existingQueue.player);

    // Resume if was playing
    if (wasPlaying) {
      existingQueue.player.unpause();
      logger.info("[plugins] Resumed music after soundboard");
    }

    // Cleanup temp player
    tempPlayer.stop();
  });

  // Error handling
  tempPlayer.on("error", (error) => {
    logger.error(`[plugins] Soundboard error: ${error.message}`);
    existingQueue.connection.subscribe(existingQueue.player);
    if (wasPlaying) existingQueue.player.unpause();
    tempPlayer.stop();
  });

  return;
}
```

### 2. Handle Edge Cases

- **User skips during soundboard:** Soundboard idle handler still runs, safely resumes
- **Bot disconnects during soundboard:** Temp player cleanup handled by connection destroy
- **Multiple soundboards triggered:** Each creates new temp player, last one wins (acceptable)

### 3. Testing Scenarios

1. ✅ Music playing → soundboard → music resumes
2. ✅ Music paused → soundboard → stays paused
3. ✅ No music → soundboard → works normally
4. ✅ User skips during soundboard → cleanup happens correctly
5. ✅ Soundboard errors → music resumes anyway

---

## TimeoutNegativeWarning Fix

The warning `TimeoutNegativeWarning: -5 is a negative number` suggests a negative duration calculation. Likely in the temporary connection path:

```typescript
// Current code (simplified):
const duration = await getAudioDuration(audioPath);
setTimeout(() => cleanup(), duration + 1000);
```

If `getAudioDuration` returns a very small value or negative (error case), the timeout becomes negative.

**Fix:** Add validation:

```typescript
const duration = await getAudioDuration(audioPath);
const timeoutDuration = Math.max(duration + 1000, 5000); // Minimum 5s
setTimeout(() => cleanup(), timeoutDuration);
```

---

## Conclusion

**Recommended:** Implement **Option 1 (Pause/Resume with Player Switching)**

This provides:

- Clean soundboard behavior
- Reliable music resume
- Simple implementation
- Easy debugging
- Minimal performance impact

The brief pause before/after soundboard is acceptable for 99% of use cases and matches user expectations for soundboard behavior.
