const steamService = require('./services/steamService');

async function testSteamConnection() {
    console.log('🔍 Testing Steam service connection...\n');
    
    // Test Steam IDs to try
    const testIds = [
        '76561199831908466', // Your Steam ID
        '76561198037867621', // Another test ID
        'gaben', // Gabe Newell's profile
        'robbinwalker' // Robin Walker's profile
    ];
    
    for (const steamId of testIds) {
        console.log(`📋 Testing Steam ID: ${steamId}`);
        console.log('━'.repeat(50));
        
        try {
            const startTime = Date.now();
            const profileData = await steamService.getProfileData(steamId);
            const endTime = Date.now();
            
            if (profileData) {
                console.log('✅ SUCCESS!');
                console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
                console.log(`👤 Name: ${profileData.personaName}`);
                console.log(`🎮 Games: ${profileData.games.total}`);
                console.log(`⏰ Hours: ${profileData.games.totalHours}`);
                console.log(`🎯 Level: ${profileData.level}`);
                console.log(`🖼️  Avatar: ${profileData.avatarUrl ? 'Yes' : 'No'}`);
                
                if (profileData.games.recentGames.length > 0) {
                    console.log(`🎲 Top games:`);
                    profileData.games.recentGames.slice(0, 3).forEach(game => {
                        console.log(`   • ${game.name} (${game.hoursPlayed}h)`);
                    });
                }
            } else {
                console.log('❌ FAILED: No data returned');
            }
        } catch (error) {
            console.log('❌ ERROR:', error.message);
            
            if (error.message.includes('timeout')) {
                console.log('💡 This looks like a timeout issue. Steam might be slow or blocking requests.');
            }
        }
        
        console.log('\n' + '═'.repeat(50) + '\n');
        
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test Steam popular games
    console.log('🔥 Testing popular games fetch...');
    try {
        const popularGames = await steamService.getPopularGames();
        if (popularGames.length > 0) {
            console.log('✅ Popular games fetch successful!');
            console.log(`📊 Found ${popularGames.length} games`);
            popularGames.slice(0, 3).forEach((game, i) => {
                console.log(`   ${i + 1}. ${game.name} (${game.currentPlayers} players)`);
            });
        } else {
            console.log('❌ No popular games data');
        }
    } catch (error) {
        console.log('❌ Popular games error:', error.message);
    }
    
    console.log('\n🏁 Test completed!');
    console.log('\n💡 Tips for fixing connection issues:');
    console.log('   • Check if Steam Community is accessible in your browser');
    console.log('   • Try using a VPN if Steam is blocked');
    console.log('   • Increase timeout values in steamService.js');
    console.log('   • Check your firewall/antivirus settings');
    console.log('   • Wait and try again later (Steam might be rate limiting)');
}

// Run the test
testSteamConnection().catch(console.error);