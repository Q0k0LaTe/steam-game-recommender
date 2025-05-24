const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Direct translation from Python
const NUM_CLUSTER = 78;
const GAME_ID_LIST = [
    105600, 107410, 211820, 222880, 227300,
    232090, 233450, 242760, 250900, 252950,
    255710, 268500, 271590, 275850, 289070, 292030, 304050, 304930,
    307780, 311210, 346110, 367520, 374320, 381210, 386360,
    397540, 413150, 418370, 431960, 444090, 460950, 489830,
    493340, 578080, 582160, 584400, 594650, 601150, 632360, 648800,
    700330, 739630, 782330, 813780, 960090, 1086940, 1174180, 1245620,
    1286830, 1332010, 1449850, 1599340, 1677740, 1971650,
    2050650, 209000, 2221490, 2231450, 2358720, 2379780, 812140,
    1318690, 1426210, 457140, 744190, 942970, 646570, 508440,
    911400
];

class RecommendationService {
    constructor() {
        // Fallback game database for when Steam API fails
        this.gameDatabase = [
            {
                title: "Cyberpunk 2077",
                tags: ["RPG", "Open World", "Sci-Fi", "Action", "Mature"],
                genres: ["RPG", "Action"],
                score: 87,
                price: "$39.99",
                appId: "1091500"
            },
            {
                title: "The Witcher 3: Wild Hunt",
                tags: ["RPG", "Fantasy", "Open World", "Story Rich"],
                genres: ["RPG", "Action"],
                score: 94,
                price: "$29.99",
                appId: "292030"
            },
            {
                title: "Counter-Strike 2",
                tags: ["FPS", "Competitive", "Multiplayer", "Tactical"],
                genres: ["Action", "FPS"],
                score: 91,
                price: "Free",
                appId: "730"
            },
            {
                title: "Stardew Valley",
                tags: ["Farming", "Indie", "Relaxing", "Simulation"],
                genres: ["Simulation", "Indie"],
                score: 96,
                price: "$14.99",
                appId: "413150"
            },
            {
                title: "Elden Ring",
                tags: ["Souls-like", "RPG", "Fantasy", "Difficult"],
                genres: ["RPG", "Action"],
                score: 95,
                price: "$49.99",
                appId: "1245620"
            },
            {
                title: "Portal 2",
                tags: ["Puzzle", "Co-op", "Sci-Fi", "Singleplayer"],
                genres: ["Puzzle", "Action"],
                score: 98,
                price: "$9.99",
                appId: "620"
            },
            {
                title: "Terraria",
                tags: ["Sandbox", "Crafting", "2D", "Multiplayer"],
                genres: ["Action", "Adventure"],
                score: 94,
                price: "$9.99",
                appId: "105600"
            },
            {
                title: "Hollow Knight",
                tags: ["Metroidvania", "Indie", "2D", "Difficult"],
                genres: ["Action", "Indie"],
                score: 97,
                price: "$14.99",
                appId: "367520"
            }
        ];
    }

    // ===== STRICT PYTHON TRANSLATION =====

    /**
     * def raw_text_processing(s: str):
     */
    rawTextProcessing(s) {
        const achievements = [];

        // Find the start of achievements section
        const startMarker = "Personal Achievements\n";
        const startIdx = s.indexOf(startMarker);

        if (startIdx === -1) {
            return null;
        }

        // Extract the achievements section
        const achievementsText = s.substring(startIdx + startMarker.length);

        // Split into lines and process
        const lines = achievementsText.split('\n');
        let i = 1;

        while (i < lines.length) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) {
                i += 1;
                continue;
            }

            if (line.includes("An error was encountered while processing your request")) {
                return null;
            }

            if (i !== lines.length - 1 && lines[i + 1].trim().includes("hidden achievements remaining")) {
                return achievements;
            }

            if (line.includes("Valve Corporation. All rights reserved.")) {
                return achievements;
            }

            if (i + 1 < lines.length) {
                const potentialName = line;
                const potentialDescription = lines[i + 1].trim();

                // Check if next line after description starts with "Unlocked" (unlocked achievement)
                if (i + 2 < lines.length && lines[i + 2].trim().startsWith("Unlocked")) {
                    achievements.push({
                        name: potentialName,
                        unlocked: true
                    });
                    i += 3; // Skip name, description, and unlock time
                }
                // Check if there's a progress indicator (locked achievement with progress)
                else if (i + 2 < lines.length && lines[i + 2].trim().includes('/')) {
                    const progressLine = lines[i + 2].trim();
                    // Verify it's a progress indicator (number/number format)
                    if (progressLine.split('/').length - 1 === 1) { // count('/') == 1
                        const parts = progressLine.split('/');
                        if (parts.length === 2 && 
                            /^\d+$/.test(parts[0].trim()) && 
                            /^\d+$/.test(parts[1].trim())) {
                            achievements.push({
                                name: potentialName,
                                unlocked: false
                            });
                            i += 3; // Skip name, description, and progress
                        } else {
                            i += 1;
                        }
                    } else {
                        i += 1;
                    }
                }
                // Otherwise, it's a locked achievement without progress
                else {
                    // Verify this looks like a real achievement by checking if description is reasonable
                    const skipWords = ['copyright', 'valve', 'steam', 'privacy', 'legal'];
                    if (potentialDescription.length > 10 &&
                        !skipWords.some(skip => potentialDescription.toLowerCase().includes(skip))) {
                        achievements.push({
                            name: potentialName,
                            unlocked: false
                        });
                    }
                    i += 2; // Skip name and description
                }
            } else {
                i += 1;
            }
        }
        return achievements;
    }

    /**
     * def get_steam_achievements_text(player_id: int, game_id: int):
     */
    async getSteamAchievementsText(playerId, gameId) {
        const url = `https://steamcommunity.com/profiles/${playerId}/stats/${gameId}/achievements`;
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        };

        try {
            const response = await axios.get(url, {
                headers: headers,
                timeout: 30000,
                maxRedirects: 5
            });

            // Check for redirect (might indicate private profile or invalid game)
            if (response.request.res && response.request.res.responseUrl && 
                !response.request.res.responseUrl.includes("achievements")) {
                return null;
            }

            // Check for successful response
            if (response.status !== 200) {
                return null;
            }

            // Check if profile is private or game not owned
            if (response.data.toLowerCase().includes("profile is private")) {
                return null;
            }

            if (response.data.toLowerCase().includes("this user has not yet set up their game stats")) {
                return null;
            }

            const $ = cheerio.load(response.data);
            return $.text().replace(/\s+/g, '\n').trim();

        } catch (error) {
            return null;
        }
    }

    /**
     * def kai_hu(player_id: int):
     */
    async kaiHu(playerId) {
        const result = [];
        console.log(`[Vector] Processing ${GAME_ID_LIST.length} games for player ${playerId}`);

        for (let i = 0; i < GAME_ID_LIST.length; i++) {
            const gameId = GAME_ID_LIST[i];
            console.log(`[Vector] Game ${i + 1}/${GAME_ID_LIST.length}: ${gameId}`);
            
            const achievements = await this.getSteamAchievementsText(playerId, gameId);
            result.push([gameId, achievements]);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        return result;
    }

    /**
     * def user_vector_generator(hu):
     */
    userVectorGenerator(hu) {
        console.log(`[Vector] Generating user vector from ${hu.length} games`);
        
        // Load data files
        let mapData, newGameData;
        try {
            const achievementsClusterMapPath = path.join(__dirname, '..', 'achievement_cluster_map.json');
            const newGameVectorPath = path.join(__dirname, '..', 'new_game_vector.json');
            
            mapData = JSON.parse(fs.readFileSync(achievementsClusterMapPath, 'utf8'));
            newGameData = JSON.parse(fs.readFileSync(newGameVectorPath, 'utf8'));
            
            console.log(`[Vector] Loaded ${Object.keys(mapData).length} achievement mappings and ${newGameData.length} game vectors`);
        } catch (error) {
            console.error('[Vector] Error loading data files:', error);
            throw error;
        }

        // total_vector = np.zeros(num_cluster)
        const totalVector = new Array(NUM_CLUSTER).fill(0);
        let totalAchievements = 0;

        // for game_id, temp in hu:
        for (const [gameId, temp] of hu) {
            if (!temp) continue;
            
            // ach_list = ast.literal_eval(str(temp))
            const achList = temp;
            
            // for entry in ach_list:
            for (const entry of achList) {
                const achievement = entry.name;
                const ifDone = entry.unlocked;
                
                // if achievement in map_data:
                if (achievement in mapData) {
                    const x = mapData[achievement];
                    // if ifDone: total_vector[x] += 1 else: total_vector[x] -= 0.2
                    if (ifDone) {
                        totalVector[x] += 1;
                    } else {
                        totalVector[x] -= 0.2;
                    }
                    totalAchievements++;
                }
                // else: continue
            }
        }

        console.log(`[Vector] Processed ${totalAchievements} achievements`);

        // np_vector = np.array(total_vector)
        // np_vector = np_vector / np.linalg.norm(np_vector)
        const magnitude = Math.sqrt(totalVector.reduce((sum, val) => sum + val * val, 0));
        const npVector = magnitude > 0 ? totalVector.map(val => val / magnitude) : totalVector;

        // new_game_ranking = []
        const newGameRanking = [];
        
        // for entry in new_game_data:
        for (const entry of newGameData) {
            // new_game_vector = np.array(entry['vector'])
            const newGameVector = entry.vector;
            
            // score = new_game_vector.dot(np_vector)
            const score = this.dotProduct(newGameVector, npVector);
            
            // new_game_ranking.append([entry['new_game_id'], score])
            newGameRanking.push([entry.new_game_id, score]);
        }

        // new_game_ranking = sorted(new_game_ranking, key=lambda x: x[1], reverse=True)
        newGameRanking.sort((a, b) => b[1] - a[1]);

        // result = []
        // for i in range(8): result.append(new_game_ranking[i][0])
        const result = [];
        for (let i = 0; i < 8; i++) {
            result.push(newGameRanking[i][0]);
        }

        console.log(`[Vector] Top 8 recommendations:`, result);
        return result;
    }

    /**
     * Calculate dot product
     */
    dotProduct(vectorA, vectorB) {
        if (vectorA.length !== vectorB.length) {
            return 0;
        }
        
        let result = 0;
        for (let i = 0; i < vectorA.length; i++) {
            result += vectorA[i] * vectorB[i];
        }
        
        return result;
    }

    /**
     * def local_kai_hu(data):
     */
    localKaiHu(data) {
        // hu = []
        const hu = [];
        
        // for game_id, content in data:
        for (const [gameId, content] of data) {
            // temp = raw_text_processing(content)
            const temp = this.rawTextProcessing(content);
            
            // if temp is not None: hu.append([game_id, temp])
            if (temp !== null) {
                hu.push([gameId, temp]);
            }
        }
        
        console.log(`[Vector] Parsed achievements from ${hu.length} games`);
        
        // return user_vector_generator(hu)
        return this.userVectorGenerator(hu);
    }

    /**
     * def niu_bi_de_han_shu(player_id): return local_kai_hu(kai_hu(player_id))
     */
    async niuBiDeHanShu(playerId) {
        console.log(`[Vector] Starting recommendation for player: ${playerId}`);
        
        try {
            // kai_hu(player_id)
            const kaiHuResult = await this.kaiHu(playerId);
            
            // local_kai_hu(kai_hu(player_id))
            const gameIds = this.localKaiHu(kaiHuResult);
            
            console.log(`[Vector] Generated recommendations: ${gameIds}`);
            return gameIds;
            
        } catch (error) {
            console.error('[Vector] Error in recommendation process:', error);
            throw error;
        }
    }

    // ===== CONVERT GAME IDS TO RECOMMENDATION OBJECTS =====

    /**
     * Main entry point - get recommendations for a Steam user
     */
    async getRecommendations(steamId) {
        try {
            console.log(`[Recommendations] Getting recommendations for Steam ID: ${steamId}`);
            
            // Try vector-based recommendations first
            try {
                // This is the equivalent of: print(niu_bi_de_han_shu(userid))
                const vectorGameIds = await this.niuBiDeHanShu(steamId);
                
                if (vectorGameIds && vectorGameIds.length > 0) {
                    console.log(`[Recommendations] Got ${vectorGameIds.length} vector-based game IDs`);
                    
                    // Convert game IDs to recommendation objects
                    const recommendations = await this.convertGameIdsToRecommendations(vectorGameIds);
                    
                    if (recommendations.length > 0) {
                        console.log(`[Recommendations] Successfully converted to ${recommendations.length} recommendation objects`);
                        return recommendations;
                    }
                }
            } catch (vectorError) {
                console.warn('[Recommendations] Vector algorithm failed:', vectorError.message);
            }
            
            // Fallback to basic recommendations
            console.log('[Recommendations] Using fallback recommendations');
            return this.getFallbackRecommendations();
            
        } catch (error) {
            console.error('[Recommendations] Error generating recommendations:', error);
            return this.getFallbackRecommendations();
        }
    }

    /**
     * Convert game IDs from vector algorithm to recommendation objects
     */
    async convertGameIdsToRecommendations(gameIds) {
        const recommendations = [];
        
        console.log(`[Convert] Converting ${gameIds.length} game IDs to recommendation objects`);
        
        for (let i = 0; i < gameIds.length; i++) {
            const gameId = gameIds[i];
            
            try {
                console.log(`[Convert] Fetching details for game ${i + 1}/${gameIds.length}: ${gameId}`);
                
                const gameDetails = await this.fetchGameDetailsFromSteam(gameId);
                
                if (gameDetails && gameDetails.name) {
                    recommendations.push({
                        appId: gameId,
                        title: gameDetails.name,
                        price: this.formatGamePrice(gameDetails.price_overview),
                        score: 95,
                        matchPercentage: 95,
                        reason: "🤖 AI-powered recommendation based on your gaming preferences",
                        tags: gameDetails.genres || [],
                        genres: gameDetails.categories || []
                    });
                } else {
                    // Add basic entry if Steam API fails
                    recommendations.push({
                        appId: gameId,
                        title: `Game ${gameId}`,
                        price: "Unknown",
                        score: 90,
                        matchPercentage: 90,
                        reason: "🤖 AI-powered recommendation",
                        tags: [],
                        genres: []
                    });
                }
                
            } catch (gameError) {
                console.warn(`[Convert] Failed to get details for game ${gameId}:`, gameError.message);
                
                // Still add the game with minimal info
                recommendations.push({
                    appId: gameId,
                    title: `Game ${gameId}`,
                    price: "Unknown",
                    score: 85,
                    matchPercentage: 85,
                    reason: "🤖 AI-powered recommendation",
                    tags: [],
                    genres: []
                });
            }
        }
        
        console.log(`[Convert] Successfully converted ${recommendations.length} games`);
        return recommendations;
    }

    /**
     * Fetch game details from Steam Store API
     */
    async fetchGameDetailsFromSteam(appId) {
        try {
            const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}&format=json`, {
                timeout: 8000
            });
            
            const gameData = response.data[appId];
            if (gameData && gameData.success && gameData.data) {
                return gameData.data;
            }
            
            return null;
            
        } catch (error) {
            console.warn(`[Steam API] Failed to fetch details for game ${appId}:`, error.message);
            return null;
        }
    }

    /**
     * Format game price for display
     */
    formatGamePrice(priceOverview) {
        if (!priceOverview || priceOverview.final === 0) {
            return 'Free to Play';
        }
        
        const price = priceOverview.final / 100;
        const currency = priceOverview.currency || 'USD';
        
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(price);
        } catch (error) {
            return `$${price.toFixed(2)}`;
        }
    }

    /**
     * Fallback recommendations when vector algorithm fails
     */
    getFallbackRecommendations() {
        return this.gameDatabase
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(game => ({
                appId: game.appId,
                title: game.title,
                price: game.price,
                score: game.score,
                matchPercentage: game.score,
                reason: "Popular and highly rated game",
                tags: game.tags,
                genres: game.genres
            }));
    }
}

module.exports = new RecommendationService();