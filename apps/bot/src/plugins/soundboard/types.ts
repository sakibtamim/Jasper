export interface Sound {
  id: string;
  name: string;
  emoji: string;
  fileUri: string; // storage://soundboard/filename.mp3
  createdAt: number;
  createdByUserId: string;
}

export interface Play {
  id: string;
  soundId: string;
  soundNameSnapshot: string;
  emojiSnapshot: string;
  userId: string;
  guildId: string;
  channelId: string | null; // Text channel
  voiceChannelId: string;
  playedAt: number;
}

export interface SoundboardStats {
  totalPlays: number;
  topSounds: {
    soundId: string;
    name: string;
    emoji: string;
    count: number;
  }[];
}
