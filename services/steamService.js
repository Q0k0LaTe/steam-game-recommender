const axios = require('axios');
const cheerio = require('cheerio');

class SteamService {
    constructor() {
        this.baseUrl = 'https://steamcommunity.com';
        this.apiKey = process.env.STEAM_API_KEY; // Optional: for enhanced data
        
        // Create axios instance with better defaults
        this.httpClient = axios.create({
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        });
    }

    // Retry mechanism for failed requests
    async retryRequest(url, options = {}, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
                const response = await this.httpClient.get(url, options);
                return response;
            } catch (error) {
                console.log(`Attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Convert various Steam ID formats to SteamID64
    async resolveSteamId(input) {
        try {
            // If it's already a SteamID64 (17 digits starting with 7656119)
            if (/^7656119[0-9]{10}$/.test(input)) {
                return input;
            }

            // If it's a profile URL, extract the ID
            if (input.includes('steamcommunity.com')) {
                const urlMatch = input.match(/steamcommunity\.com\/(?:profiles\/(\d+)|id\/([^\/]+))/);
                if (urlMatch) {
                    if (urlMatch[1]) {
                        return urlMatch[1]; // SteamID64 from profile URL
                    } else if (urlMatch[2]) {
                        // Custom URL - need to resolve
                        return await this.resolveCustomUrl(urlMatch[2]);
                    }
                }
            }

            // If it's just a custom URL name
            if (!/^\d+$/.test(input)) {
                return await this.resolveCustomUrl(input);
            }

            return input;
        } catch (error) {
            console.error('Error resolving Steam ID:', error);
            throw new Error('Invalid Steam ID format');
        }
    }

    async resolveCustomUrl(customUrl) {
        try {
            console.log(`Resolving custom URL: ${customUrl}`);
            const response = await this.retryRequest(`${this.baseUrl}/id/${customUrl}/?xml=1`);

            const $ = cheerio.load(response.data, { xmlMode: true });
            const steamId64 = $('steamID64').text();
            
            if (!steamId64) {
                throw new Error('Custom URL not found');
            }
            
            console.log(`Resolved ${customUrl} to ${steamId64}`);
            return steamId64;
        } catch (error) {
            console.error(`Failed to resolve custom URL ${customUrl}:`, error.message);
            throw new Error('Failed to resolve custom URL');
        }
    }

    async getProfileData(steamIdInput) {
        try {
            console.log(`Getting profile data for: ${steamIdInput}`);
            const steamId64 = await this.resolveSteamId(steamIdInput);
            console.log(`Resolved to Steam ID64: ${steamId64}`);
            
            // Try multiple approaches to get profile data
            let profileData = null;
            
            // Method 1: Try XML endpoint first
            try {
                profileData = await this.getProfileDataXML(steamId64);
                if (profileData) {
                    console.log('Successfully got profile data via XML');
                }
            } catch (error) {
                console.log('XML method failed:', error.message);
            }
            
            // Method 2: Try HTML scraping if XML fails
            if (!profileData) {
                try {
                    profileData = await this.getProfileDataHTML(steamId64);
                    if (profileData) {
                        console.log('Successfully got profile data via HTML scraping');
                    }
                } catch (error) {
                    console.log('HTML method failed:', error.message);
                }
            }
            
            // Method 3: Use Steam API if available and other methods fail
            if (!profileData && this.apiKey) {
                try {
                    profileData = await this.getProfileDataAPI(steamId64);
                    if (profileData) {
                        console.log('Successfully got profile data via Steam API');
                    }
                } catch (error) {
                    console.log('API method failed:', error.message);
                }
            }
            
            if (!profileData) {
                console.log('All methods failed to get profile data');
                return null;
            }

            // Get additional stats (level, achievements, badges)
            const statsData = await this.getProfileStats(steamId64);
            profileData = { ...profileData, ...statsData };

            // Get games data
            const gamesData = await this.getGamesData(steamId64);
            profileData.games = gamesData;

            console.log(`Profile data retrieved for ${profileData.personaName}`);
            return profileData;
        } catch (error) {
            console.error('Error fetching profile data:', error.message);
            return null;
        }
    }

    async getProfileDataXML(steamId64) {
        const response = await this.retryRequest(`${this.baseUrl}/profiles/${steamId64}/?xml=1`);
        const $ = cheerio.load(response.data, { xmlMode: true });
        
        // Check if profile exists and is public
        const error = $('error').text();
        if (error) {
            throw new Error(`Profile error: ${error}`);
        }

        return {
            steamId64: steamId64,
            personaName: $('steamID').text() || 'Unknown Player',
            realName: $('realname').text() || '',
            avatarUrl: $('avatarMedium').text() || $('avatarIcon').text() || '',
            profileUrl: $('profile').text() || `${this.baseUrl}/profiles/${steamId64}`,
            location: $('location').text() || '',
            memberSince: $('memberSince').text() || '',
            summary: $('summary').text() || '',
            privacyState: $('privacyState').text() || 'public'
        };
    }

    async getProfileDataHTML(steamId64) {
        const response = await this.retryRequest(`${this.baseUrl}/profiles/${steamId64}`);
        const $ = cheerio.load(response.data);
        
        // Check if profile exists
        if ($('.error_ctn').length > 0) {
            throw new Error('Profile not found or private');
        }

        // Extract basic info
        const personaName = $('.actual_persona_name').text() || 
                           $('.profile_small_header_name .ellipsis').text() || 
                           'Unknown Player';
        
        const avatarUrl = $('.playerAvatarAutoSizeInner img').attr('src') || '';
        const realName = $('.header_real_name').text().trim() || '';
        const location = $('.header_real_name').next().text().trim() || '';

        return {
            steamId64: steamId64,
            personaName: personaName,
            realName: realName,
            avatarUrl: avatarUrl,
            profileUrl: `${this.baseUrl}/profiles/${steamId64}`,
            location: location,
            memberSince: '',
            summary: '',
            privacyState: 'public'
        };
    }

    async getProfileDataAPI(steamId64) {
        if (!this.apiKey) {
            throw new Error('Steam API key not available');
        }

        const response = await this.retryRequest(
            `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=${steamId64}`
        );

        const players = response.data.response.players;
        if (!players || players.length === 0) {
            throw new Error('Player not found via API');
        }

        const player = players[0];
        return {
            steamId64: steamId64,
            personaName: player.personaname || 'Unknown Player',
            realName: player.realname || '',
            avatarUrl: player.avatarmedium || player.avatar || '',
            profileUrl: player.profileurl || `${this.baseUrl}/profiles/${steamId64}`,
            location: `${player.loccountrycode || ''} ${player.locstatecode || ''}`.trim(),
            memberSince: player.timecreated ? new Date(player.timecreated * 1000).toLocaleDateString() : '',
            summary: '',
            privacyState: player.communityvisibilitystate === 3 ? 'public' : 'private'
        };
    }

    async getProfileStats(steamId64) {
        try {
            const profileResponse = await this.retryRequest(`${this.baseUrl}/profiles/${steamId64}`);
            const $ = cheerio.load(profileResponse.data);
            
            // Extract Steam level with multiple selectors
            let level = 0;
            const levelSelectors = [
                '.persona_level .friendPlayerLevelNum',
                '.profile_header_badge_level',
                '.steam_level .friendPlayerLevelNum',
                '.profile_header .level'
            ];
            
            for (const selector of levelSelectors) {
                const levelText = $(selector).text().trim();
                if (levelText && /^\d+$/.test(levelText)) {
                    level = parseInt(levelText);
                    console.log(`Found Steam level: ${level} using selector: ${selector}`);
                    break;
                }
            }

            // If level still not found, try extracting from badge area
            if (level === 0) {
                const badgeText = $('.profile_header_badge').text();
                const levelMatch = badgeText.match(/Level\s+(\d+)/i);
                if (levelMatch) {
                    level = parseInt(levelMatch[1]);
                    console.log(`Found Steam level from badge text: ${level}`);
                }
            }

            // Extract total achievements
            let totalAchievements = 0;
            const achievementSelectors = [
                '.profile_achievements .profile_count_link_total',
                '.achievement_showcase .showcase_stat',
                '.profile_item_links a[href*="achievements"] .profile_count_link_total'
            ];

            for (const selector of achievementSelectors) {
                const achievementText = $(selector).text().trim();
                const achievementMatch = achievementText.match(/(\d+)/);
                if (achievementMatch) {
                    totalAchievements = parseInt(achievementMatch[1]);
                    console.log(`Found achievements: ${totalAchievements} using selector: ${selector}`);
                    break;
                }
            }

            // Extract perfect games (games with 100% achievements)
            let perfectGames = 0;
            const perfectGamesText = $('.profile_perfect_games .profile_count_link_total').text();
            if (perfectGamesText) {
                const perfectMatch = perfectGamesText.match(/(\d+)/);
                if (perfectMatch) {
                    perfectGames = parseInt(perfectMatch[1]);
                }
            }

            // Extract badges count
            let badges = 0;
            const badgesText = $('.profile_item_links a[href*="badges"] .profile_count_link_total').first().text();
            if (badgesText) {
                const badgeMatch = badgesText.match(/(\d+)/);
                if (badgeMatch) {
                    badges = parseInt(badgeMatch[1]);
                }
            }

            // Extract years of service
            let yearsOfService = 0;
            const serviceText = $('.badge_description').text();
            const yearsMatch = serviceText.match(/(\d+)\s+years?/i);
            if (yearsMatch) {
                yearsOfService = parseInt(yearsMatch[1]);
            }

            console.log(`Profile stats - Level: ${level}, Achievements: ${totalAchievements}, Perfect Games: ${perfectGames}, Badges: ${badges}`);

            return {
                level: level,
                totalAchievements: totalAchievements,
                perfectGames: perfectGames,
                badges: badges,
                yearsOfService: yearsOfService
            };
        } catch (error) {
            console.error('Error fetching profile stats:', error.message);
            return {
                level: 0,
                totalAchievements: 0,
                perfectGames: 0,
                badges: 0,
                yearsOfService: 0
            };
        }
    }

    async getGamesData(steamId64) {
        try {
            console.log(`Getting games data for ${steamId64}`);
            
            // Try XML first
            try {
                const gamesResponse = await this.retryRequest(`${this.baseUrl}/profiles/${steamId64}/games/?tab=all&xml=1`);
                const $ = cheerio.load(gamesResponse.data, { xmlMode: true });
                
                const games = [];
                $('game').each((i, game) => {
                    const $game = $(game);
                    games.push({
                        appId: $game.find('appID').text(),
                        name: $game.find('name').text(),
                        hoursPlayed: parseFloat($game.find('hoursOnRecord').text()) || 0,
                        logoUrl: $game.find('logo').text(),
                        iconUrl: $game.find('globalStatsLink').text()
                    });
                });

                const totalHours = games.reduce((sum, game) => sum + game.hoursPlayed, 0);
                
                console.log(`Found ${games.length} games via XML`);
                return {
                    total: games.length,
                    list: games.slice(0, 20), // Return top 20 games
                    totalHours: Math.round(totalHours * 10) / 10,
                    recentGames: games
                        .filter(game => game.hoursPlayed > 0)
                        .sort((a, b) => b.hoursPlayed - a.hoursPlayed)
                        .slice(0, 5)
                };
            } catch (xmlError) {
                console.log('XML games fetch failed, trying HTML scraping:', xmlError.message);
                
                // Fallback: Try HTML scraping
                try {
                    const response = await this.retryRequest(`${this.baseUrl}/profiles/${steamId64}/games/?tab=all`);
                    const $ = cheerio.load(response.data);
                    
                    // This is a simplified HTML scraping approach
                    // Steam's games page is heavily JavaScript-dependent, so this might not work perfectly
                    const games = [];
                    
                    // Try to extract game data from HTML (this is limited)
                    $('.gameListRow').each((i, row) => {
                        const $row = $(row);
                        const name = $row.find('.gameListRowItemName').text().trim();
                        const hoursText = $row.find('.gameListRowItemName').next().text();
                        const hours = parseFloat(hoursText.match(/[\d.]+/)?.[0]) || 0;
                        
                        if (name) {
                            games.push({
                                appId: '',
                                name: name,
                                hoursPlayed: hours,
                                logoUrl: '',
                                iconUrl: ''
                            });
                        }
                    });
                    
                    const totalHours = games.reduce((sum, game) => sum + game.hoursPlayed, 0);
                    
                    console.log(`Found ${games.length} games via HTML scraping`);
                    return {
                        total: games.length,
                        list: games.slice(0, 20),
                        totalHours: Math.round(totalHours * 10) / 10,
                        recentGames: games
                            .filter(game => game.hoursPlayed > 0)
                            .sort((a, b) => b.hoursPlayed - a.hoursPlayed)
                            .slice(0, 5)
                    };
                } catch (htmlError) {
                    console.log('HTML games scraping also failed:', htmlError.message);
                    throw htmlError;
                }
            }
        } catch (error) {
            console.error('Error fetching games data:', error.message);
            return {
                total: 0,
                list: [],
                totalHours: 0,
                recentGames: []
            };
        }
    }

    // Get popular games for recommendations
    async getPopularGames() {
        try {
            console.log('Fetching popular games from Steam stats...');
            const response = await this.retryRequest('https://store.steampowered.com/stats/');
            const $ = cheerio.load(response.data);
            const games = [];

            $('.player_count_row').each((i, row) => {
                if (i >= 20) return false; // Limit to top 20
                
                const $row = $(row);
                const name = $row.find('.game_name a').text().trim();
                const players = $row.find('.current_players').text().trim();
                const peak = $row.find('.peak_players').text().trim();
                
                if (name) {
                    games.push({
                        name: name,
                        currentPlayers: players,
                        peakPlayers: peak
                    });
                }
            });

            console.log(`Found ${games.length} popular games`);
            return games;
        } catch (error) {
            console.error('Error fetching popular games:', error.message);
            return [];
        }
    }
}

module.exports = new SteamService();