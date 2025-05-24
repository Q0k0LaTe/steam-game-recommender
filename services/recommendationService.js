const steamService = require('./steamService');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Vector Algorithm Integration - Direct translation from Python
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
        // Your existing predefined game database
        this.gameDatabase = [
            {
                title: "Cyberpunk 2077",
                tags: ["RPG", "Open World", "Sci-Fi", "Action", "Mature"],
                genres: ["RPG", "Action"],
                score: 87,
                price: "$39.99",
                icon: "🌆",
                gradient: "linear-gradient(135deg, #ff006e 0%, #8338ec 100%)",
                appId: "1091500"
            },
            {
                title: "The Witcher 3: Wild Hunt",
                tags: ["RPG", "Fantasy", "Open World", "Story Rich"],
                genres: ["RPG", "Action"],
                score: 94,
                price: "$29.99",
                icon: "⚔️",
                gradient: "linear-gradient(135deg, #f72585 0%, #4361ee 100%)",
                appId: "292030"
            },
            {
                title: "Counter-Strike 2",
                tags: ["FPS", "Competitive", "Multiplayer", "Tactical"],
                genres: ["Action", "FPS"],
                score: 91,
                price: "Free",
                icon: "🔫",
                gradient: "linear-gradient(135deg, #ff9500 0%, #ff5400 100%)",
                appId: "730"
            },
            {
                title: "Dota 2",
                tags: ["MOBA", "Strategy", "Multiplayer", "Competitive"],
                genres: ["Strategy", "MOBA"],
                score: 89,
                price: "Free",
                icon: "🏆",
                gradient: "linear-gradient(135deg, #7209b7 0%, #2d1b69 100%)",
                appId: "570"
            },
            {
                title: "Red Dead Redemption 2",
                tags: ["Western", "Open World", "Action", "Story Rich"],
                genres: ["Action", "Adventure"],
                score: 92,
                price: "$59.99",
                icon: "🤠",
                gradient: "linear-gradient(135deg, #d62828 0%, #f77f00 100%)",
                appId: "1174180"
            },
            {
                title: "Stardew Valley",
                tags: ["Farming", "Indie", "Relaxing", "Simulation"],
                genres: ["Simulation", "Indie"],
                score: 96,
                price: "$14.99",
                icon: "🌾",
                gradient: "linear-gradient(135deg, #38a3a5 0%, #57cc99 100%)",
                appId: "413150"
            },
            {
                title: "Elden Ring",
                tags: ["Souls-like", "RPG", "Fantasy", "Difficult"],
                genres: ["RPG", "Action"],
                score: 95,
                price: "$49.99",
                icon: "💍",
                gradient: "linear-gradient(135deg, #6a4c93 0%, #1a1a2e 100%)",
                appId: "1245620"
            },
            {
                title: "Half-Life: Alyx",
                tags: ["VR", "Action", "Sci-Fi", "Story Rich"],
                genres: ["Action", "VR"],
                score: 93,
                price: "$59.99",
                icon: "🥽",
                gradient: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
                appId: "546560"
            },
            {
                title: "Portal 2",
                tags: ["Puzzle", "Co-op", "Sci-Fi", "Singleplayer"],
                genres: ["Puzzle", "Action"],
                score: 98,
                price: "$9.99",
                icon: "🌀",
                gradient: "linear-gradient(135deg, #4cc9f0 0%, #7209b7 100%)",
                appId: "620"
            },
            {
                title: "Among Us",
                tags: ["Multiplayer", "Social Deduction", "Casual", "Indie"],
                genres: ["Casual", "Indie"],
                score: 85,
                price: "$4.99",
                icon: "👥",
                gradient: "linear-gradient(135deg, #ff0a54 0%, #ff477e 100%)",
                appId: "945360"
            },
            {
                title: "Terraria",
                tags: ["Sandbox", "Crafting", "2D", "Multiplayer"],
                genres: ["Action", "Adventure"],
                score: 94,
                price: "$9.99",
                icon: "🏗️",
                gradient: "linear-gradient(135deg, #06ffa5 0%, #00d4aa 100%)",
                appId: "105600"
            },
            {
                title: "Hollow Knight",
                tags: ["Metroidvania", "Indie", "2D", "Difficult"],
                genres: ["Action", "Indie"],
                score: 97,
                price: "$14.99",
                icon: "🦋",
                gradient: "linear-gradient(135deg, #560bad 0%, #000000 100%)",
                appId: "367520"
            }
        ];
    }

    // VECTOR ALGORITHM INTEGRATION - STRICT translation from Python

    /**
     * Process raw text from Steam achievements page
     * Direct translation of raw_text_processing function
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
            const line = lines[i].strip();

            // Skip empty lines
            if (!line) {
                i += 1;
                continue;
            }

            if (line.includes("An error was encountered while processing your request")) {
                return null;
            }

            if (i !== lines.length - 1 && lines[i + 1].strip().includes("hidden achievements remaining")) {
                return achievements;
            }

            if (line.includes("Valve Corporation. All rights reserved.")) {
                return achievements;
            }

            if (i + 1 < lines.length) {
                const potentialName = line;
                const potentialDescription = lines[i + 1].strip();

                // Check if next line after description starts with "Unlocked" (unlocked achievement)
                if (i + 2 < lines.length && lines[i + 2].strip().startsWith("Unlocked")) {
                    achievements.push({
                        name: potentialName,
                        unlocked: true
                    });
                    i += 3; // Skip name, description, and unlock time
                }
                // Check if there's a progress indicator (locked achievement with progress)
                else if (i + 2 < lines.length && lines[i + 2].strip().includes('/')) {
                    const progressLine = lines[i + 2].strip();
                    // Verify it's a progress indicator (number/number format)
                    if (progressLine.split('/').length - 1 === 1) { // count('/') == 1
                        const parts = progressLine.split('/');
                        if (parts.length === 2 && 
                            /^\d+$/.test(parts[0].strip()) && 
                            /^\d+$/.test(parts[1].strip())) {
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
     * Fetch and process Steam achievements for a specific player and game
     * Direct translation of get_steam_achievements_text function
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
            if (response.request.res.responseUrl && !response.request.res.responseUrl.includes("achievements")) {
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
     * Process all games for a specific player
     * Direct translation of kai_hu function - uses PREDEFINED game_id_list
     */
    async kaiHu(playerId) {
        const result = [];
        console.log(`Starting achievement processing for player: ${playerId}`);

        for (let i = 0; i < GAME_ID_LIST.length; i++) {
            const gameId = GAME_ID_LIST[i];
            console.log(`Processing game ${i + 1}/${GAME_ID_LIST.length}: ${gameId}`);
            
            const achievements = await this.getSteamAchievementsText(playerId, gameId);
            result.push([gameId, achievements]);
        }

        return result;
    }

    /**
     * Generate user vector from achievement data
     * Direct translation of user_vector_generator function
     */
    userVectorGenerator(hu) {
        // Load files exactly like Python
        let mapData, newGameData;
        
        try {
            const achievementsClusterMapPath = path.join(__dirname, '..', 'achievement_cluster_map.json');
            const newGameVectorPath = path.join(__dirname, '..', 'new_game_vector.json');
            
            mapData = JSON.parse(fs.readFileSync(achievementsClusterMapPath, 'utf8'));
            newGameData = JSON.parse(fs.readFileSync(newGameVectorPath, 'utf8'));
        } catch (error) {
            console.error('Error loading vector data files:', error);
            throw error;
        }

        // Initialize total_vector exactly like Python: np.zeros(num_cluster)
        const totalVector = new Array(NUM_CLUSTER).fill(0);

        // Process each game's achievements
        for (const [gameId, temp] of hu) {
            // Python: ach_list = ast.literal_eval(str(temp))
            // In JS, temp is already the processed achievement list
            const achList = temp;
            
            for (const entry of achList) {
                const achievement = entry.name;
                const ifDone = entry.unlocked;
                
                // Python: if achievement in map_data:
                if (achievement in mapData) {
                    const x = mapData[achievement];
                    
                    // Python: if ifDone: total_vector[x] += 1 else: total_vector[x] -= 0.2
                    if (ifDone) {
                        totalVector[x] += 1;
                    } else {
                        totalVector[x] -= 0.2;
                    }
                }
                // Python: else: continue
            }
        }

        // Python: np_vector = np.array(total_vector)
        // Python: np_vector = np_vector / np.linalg.norm(np_vector)
        const magnitude = Math.sqrt(totalVector.reduce((sum, val) => sum + val * val, 0));
        const npVector = magnitude > 0 ? totalVector.map(val => val / magnitude) : totalVector;

        // Python: new_game_ranking = []
        const newGameRanking = [];
        
        // Python: for entry in new_game_data:
        for (const entry of newGameData) {
            // Python: new_game_vector = np.array(entry['vector'])
            const newGameVector = entry.vector;
            
            // Python: score = new_game_vector.dot(np_vector)
            const score = this.dotProduct(newGameVector, npVector);
            
            // Python: new_game_ranking.append([entry['new_game_id'], score])
            newGameRanking.push([entry.new_game_id, score]);
        }

        // Python: new_game_ranking = sorted(new_game_ranking, key=lambda x: x[1], reverse=True)
        newGameRanking.sort((a, b) => b[1] - a[1]);

        // Python: result = []
        // Python: for i in range(8): result.append(new_game_ranking[i][0])
        const result = [];
        for (let i = 0; i < 8; i++) {
            result.push(newGameRanking[i][0]);
        }

        return result;
    }

    /**
     * Calculate dot product of two vectors
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
     * Process local achievement data
     * Direct translation of local_kai_hu function
     */
    localKaiHu(data) {
        // Python: hu = []
        const hu = [];
        
        // Python: for game_id, content in data:
        for (const [gameId, content] of data) {
            // Python: temp = raw_text_processing(content)
            const temp = this.rawTextProcessing(content);
            
            // Python: if temp is not None: hu.append([game_id, temp])
            if (temp !== null) {
                hu.push([gameId, temp]);
            }
        }
        
        // Python: return user_vector_generator(hu)
        return this.userVectorGenerator(hu);
    }

    /**
     * Main function - Direct translation of niu_bi_de_han_shu
     * Python: def niu_bi_de_han_shu(player_id): return local_kai_hu(kai_hu(player_id))
     */
    async niuBiDeHanShu(playerId) {
        console.log(`Starting vector recommendation for player: ${playerId}`);
        
        try {
            // Python: kai_hu(player_id)
            const kaiHuResult = await this.kaiHu(playerId);
            
            // Python: local_kai_hu(kai_hu(player_id))
            const gameIds = this.localKaiHu(kaiHuResult);
            
            console.log(`Generated ${gameIds.length} vector-based recommendations:`, gameIds);
            
            // Convert game IDs to game objects
            const recommendations = await this.convertGameIdsToObjects(gameIds);
            return recommendations;
            
        } catch (error) {
            console.error('Error in vector recommendation process:', error);
            throw error;
        }
    }

    /**
     * Generate user vector from achievement data
     */
    userVectorGenerator(hu) {
        // Load achievement cluster map and game vectors
        let mapData, newGameData;
        
        try {
            const achievementsClusterMapPath = path.join(__dirname, '..', 'achievement_cluster_map.json');
            const newGameVectorPath = path.join(__dirname, '..', 'new_game_vector.json');
            
            mapData = JSON.parse(fs.readFileSync(achievementsClusterMapPath, 'utf8'));
            newGameData = JSON.parse(fs.readFileSync(newGameVectorPath, 'utf8'));
        } catch (error) {
            console.error('Error loading vector data files:', error);
            throw error;
        }

        const totalVector = new Array(NUM_CLUSTER).fill(0);

        for (const [gameId, temp] of hu) {
            if (!temp) continue;
            
            const achList = temp; // temp is already the processed achievement list
            
            for (const entry of achList) {
                const achievement = entry.name;
                const ifDone = entry.unlocked;
                
                if (achievement in mapData) {
                    const x = mapData[achievement];
                    if (ifDone) {
                        totalVector[x] += 1;
                    } else {
                        totalVector[x] -= 0.2;
                    }
                }
            }
        }

        // Normalize vector
        const magnitude = Math.sqrt(totalVector.reduce((sum, val) => sum + val * val, 0));
        const npVector = magnitude > 0 ? totalVector.map(val => val / magnitude) : totalVector;

        const newGameRanking = [];
        
        for (const entry of newGameData) {
            const newGameVector = entry.vector;
            const score = this.dotProduct(newGameVector, npVector);
            newGameRanking.push([entry.new_game_id, score]);
        }

        // Sort by score descending
        newGameRanking.sort((a, b) => b[1] - a[1]);

        const result = [];
        for (let i = 0; i < Math.min(8, newGameRanking.length); i++) {
            result.push(newGameRanking[i][0]);
        }

        return result;
    }

    /**
     * Calculate dot product of two vectors
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
     * Process local achievement data
     */
    localKaiHu(data) {
        const hu = [];
        
        for (const [gameId, content] of data) {
            const temp = this.rawTextProcessing(content);
            if (temp !== null) {
                hu.push([gameId, temp]);
            }
        }
        
        return this.userVectorGenerator(hu);
    }

    /**
     * Main vector-based recommendation function
     */
    async niuBiDeHanShu(playerId) {
        console.log(`Starting vector recommendation process for player: ${playerId}`);
        
        try {
            const achievementData = await this.kaiHu(playerId);
            console.log(`Fetched achievement data for ${achievementData.length} games`);
            
            const gameIds = this.localKaiHu(achievementData);
            console.log(`Generated ${gameIds.length} vector-based recommendations:`, gameIds);
            
            // Convert game IDs to game objects with details
            const recommendations = await this.convertGameIdsToObjects(gameIds);
            return recommendations;
            
        } catch (error) {
            console.error('Error in vector recommendation process:', error);
            throw error;
        }
    }

    /**
     * Convert game IDs to game objects with Steam data
     */
    async convertGameIdsToObjects(gameIds) {
        const recommendations = [];
        
        for (const gameId of gameIds) {
            try {
                const gameDetails = await this.fetchGameDetails(gameId);
                recommendations.push({
                    appId: gameId,
                    title: gameDetails.name || `Game ${gameId}`,
                    price: this.formatPrice(gameDetails.price_overview),
                    score: 95, // High score for vector-based recommendations
                    matchPercentage: 95,
                    reason: "AI-powered recommendation based on your gaming preferences",
                    tags: gameDetails.genres || [],
                    genres: gameDetails.categories || []
                });
            } catch (error) {
                console.warn(`Could not fetch details for game ${gameId}:`, error.message);
                // Add basic game info if Steam API fails
                recommendations.push({
                    appId: gameId,
                    title: `Game ${gameId}`,
                    price: "Unknown",
                    score: 90,
                    matchPercentage: 90,
                    reason: "AI-powered recommendation",
                    tags: [],
                    genres: []
                });
            }
        }
        
        return recommendations;
    }

    /**
     * Fetch game details from Steam API
     */
    async fetchGameDetails(appId) {
        try {
            const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}&format=json`, {
                timeout: 5000
            });
            
            const gameData = response.data[appId];
            if (gameData && gameData.success && gameData.data) {
                return gameData.data;
            }
            
            throw new Error('No game data returned');
        } catch (error) {
            throw new Error(`Failed to fetch game details: ${error.message}`);
        }
    }

    // MAIN RECOMMENDATION FUNCTION - Modified to use vector algorithm first
    async getRecommendations(steamId) {
        try {
            console.log(`Getting recommendations for Steam ID: ${steamId}`);
            
            // Try vector-based recommendations first
            try {
                const vectorRecommendations = await this.niuBiDeHanShu(steamId);
                if (vectorRecommendations && vectorRecommendations.length > 0) {
                    console.log(`Successfully generated ${vectorRecommendations.length} vector-based recommendations`);
                    return vectorRecommendations;
                }
            } catch (vectorError) {
                console.warn('Vector-based recommendations failed:', vectorError.message);
                console.log('Falling back to profile-based recommendations');
            }
            
            // Fallback to your existing profile-based recommendations
            const profileData = await steamService.getProfileData(steamId);
            
            if (!profileData || !profileData.games) {
                return this.getFallbackRecommendations();
            }

            const userGames = profileData.games.list || [];
            const recommendations = this.generatePersonalizedRecommendations(userGames, profileData);
            
            return recommendations;
        } catch (error) {
            console.error('Error generating recommendations:', error);
            return this.getFallbackRecommendations();
        }
    }

    // Keep all your existing methods below...
    
    generatePersonalizedRecommendations(userGames, profileData) {
        // Your existing implementation
        const userPreferences = this.analyzeUserPreferences(userGames);
        
        const scoredGames = this.gameDatabase.map(game => {
            const baseScore = game.score;
            const preferenceScore = this.calculatePreferenceScore(game, userPreferences);
            const ownershipPenalty = this.checkOwnership(game, userGames);
            
            const finalScore = Math.min(99, Math.max(60, 
                Math.round(baseScore * 0.6 + preferenceScore * 0.4 - ownershipPenalty)
            ));
            
            return {
                ...game,
                score: finalScore,
                reason: this.generateRecommendationReason(game, userPreferences)
            };
        });

        return scoredGames
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(game => ({
                ...game,
                matchPercentage: game.score
            }));
    }

    analyzeUserPreferences(userGames) {
        // Your existing implementation
        const preferences = {
            genres: {},
            totalHours: 0,
            avgHoursPerGame: 0,
            topGames: userGames.slice(0, 5)
        };

        userGames.forEach(game => {
            preferences.totalHours += game.hoursPlayed || 0;
            
            this.detectGameGenres(game.name).forEach(genre => {
                preferences.genres[genre] = (preferences.genres[genre] || 0) + (game.hoursPlayed || 1);
            });
        });

        preferences.avgHoursPerGame = userGames.length > 0 ? 
            preferences.totalHours / userGames.length : 0;

        return preferences;
    }

    detectGameGenres(gameName) {
        // Your existing implementation
        const genres = [];
        const name = gameName.toLowerCase();
        
        if (name.includes('counter') || name.includes('cs') || name.includes('call of duty')) {
            genres.push('FPS');
        }
        if (name.includes('dota') || name.includes('league')) {
            genres.push('MOBA');
        }
        if (name.includes('witcher') || name.includes('skyrim') || name.includes('fallout')) {
            genres.push('RPG');
        }
        if (name.includes('civilization') || name.includes('strategy')) {
            genres.push('Strategy');
        }
        if (name.includes('portal') || name.includes('puzzle')) {
            genres.push('Puzzle');
        }
        
        return genres.length > 0 ? genres : ['Action'];
    }

    calculatePreferenceScore(game, userPreferences) {
        // Your existing implementation
        let score = 50;
        
        game.genres.forEach(genre => {
            if (userPreferences.genres[genre]) {
                score += Math.min(20, userPreferences.genres[genre] / 10);
            }
        });

        game.tags.forEach(tag => {
            if (userPreferences.genres[tag]) {
                score += Math.min(10, userPreferences.genres[tag] / 20);
            }
        });

        return Math.min(100, score);
    }

    checkOwnership(game, userGames) {
        // Your existing implementation
        const owned = userGames.some(userGame => 
            userGame.name.toLowerCase().includes(game.title.toLowerCase()) ||
            game.title.toLowerCase().includes(userGame.name.toLowerCase())
        );
        
        return owned ? 50 : 0;
    }

    generateRecommendationReason(game, userPreferences) {
        // Your existing implementation
        const topGenres = Object.entries(userPreferences.genres)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([genre]) => genre);

        const matchingGenres = game.genres.filter(genre => topGenres.includes(genre));
        
        if (matchingGenres.length > 0) {
            return `Based on your interest in ${matchingGenres.join(', ')} games`;
        }
        
        return `Highly rated game similar to your preferences`;
    }

    formatPrice(priceOverview) {
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

    getFallbackRecommendations() {
        // Your existing implementation
        return this.gameDatabase
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(game => ({
                ...game,
                matchPercentage: game.score,
                reason: "Popular and highly rated game"
            }));
    }
}

module.exports = new RecommendationService();