import db from '../src/core/db/index.js';
import logger from '../src/core/logger.js';

async function verify() {
    try {
        logger.info('Starting verification...');

        // 1. Init DB
        await db.init();

        // 2. Track some plays
        logger.info('Tracking plays...');
        await db.trackPlay({
            userId: 'user1',
            guildId: 'guild1',
            channelId: 'channel1',
            botName: 'Jasper',
            songTitle: 'Song 1',
            songUrl: 'http://example.com/1',
            duration: 180,
            playedAt: new Date()
        });
        await db.trackPlay({
            userId: 'user1',
            guildId: 'guild1',
            channelId: 'channel1',
            botName: 'Jasper',
            songTitle: 'Song 2',
            songUrl: 'http://example.com/2',
            duration: 200,
            playedAt: new Date()
        });
        await db.trackPlay({
            userId: 'user2',
            guildId: 'guild1',
            channelId: 'channel1',
            botName: 'Jasper',
            songTitle: 'Song 1',
            songUrl: 'http://example.com/1',
            duration: 180,
            playedAt: new Date()
        });

        // 3. Check Stats
        logger.info('Checking stats...');
        const topSongs = await db.getTopSongs(5);
        const topUsers = await db.getTopUsers(5);
        const globalStats = await db.getGlobalStats();

        console.log('Top Songs:', topSongs);
        console.log('Top Users:', topUsers);
        console.log('Global Stats:', globalStats);

        // Assertions
        if (topSongs.length !== 2) throw new Error('Expected 2 top songs');
        if (topSongs[0].songTitle !== 'Song A') throw new Error('Expected Song A to be top');
        if (topSongs[0].playCount !== 2) throw new Error('Expected Song A to have 2 plays');

        if (topUsers.length !== 2) throw new Error('Expected 2 top users');
        if (topUsers[0].userId !== 'user1') throw new Error('Expected user1 to be top');

        if (globalStats.totalPlays !== 3) throw new Error('Expected 3 total plays');
        if (globalStats.totalDuration !== 420) throw new Error('Expected 420 total duration');

        logger.info('✅ Verification Passed!');
    } catch (error) {
        logger.error(`❌ Verification Failed: ${error}`);
        process.exit(1);
    } finally {
        await db.close();
    }
}

verify();
