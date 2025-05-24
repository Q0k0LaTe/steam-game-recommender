const steamService = require('./steamService');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class RecommendationService {
    constructor() {
        this.gameVectors = null;
        this.achievementMap = null;
        this.loadVectorData();
        
        // Fallback game database for when vector system fails
        this.fallbackGames = [
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

    async loadVectorData() {
        try {
            // Load the game vectors
            const vectorPath = path.join(__dirname, '..', 'new_game_vector.json');
            const vectorData = await fs.readFile(vectorPath, 'utf8');
            this.gameVectors = JSON.parse(vectorData);
            
            // Load achievement cluster map
            const mapPath = path.join(__dirname, '..', 'achievement_cluster_map.json');
            const mapData = await fs.readFile(mapPath, 'utf8');
            this.achievementMap = JSON.parse(mapData);
            
            console.log(`Loaded ${this.gameVectors.length} game vectors and ${Object.keys(this.achievementMap).length} achievement mappings`);
        } catch (error) {
            console.error('Error loading vector data:', error);
            console.log('Falling back to basic recommendation system');
        }
    }

    async getRecommendations(steamId) {
        try {
            console.log(`Getting recommendations for Steam ID: ${steamId}`);
            
            // Try vector-based recommendations first
            if (this.gameVectors && this.achievementMap) {
                try {
                    const vectorRecommendations = await this.getVectorBasedRecommendations(steamId);
                    if (vectorRecommendations && vectorRecommendations.length > 0) {
                        console.log(`Generated ${vectorRecommendations.length} vector-based recommendations`);
                        return vectorRecommendations;
                    }
                } catch (vectorError) {
                    console.error('Vector-based recommendations failed:', vectorError);
                }
            }
            
            // Fallback to profile-based recommendations
            console.log('Using fallback recommendation system');
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

    async getVectorBasedRecommendations(steamId) {
        try {
            // Get user's achievement data
            const userAchievements = await this.getUserAchievements(steamId);
            
            if (!userAchievements || userAchievements.length === 0) {
                console.log('No achievement data found for vector analysis');
                throw new Error('No achievement data available');
            }

            // Generate user vector based on achievements
            const userVector = this.generateUserVector(userAchievements);
            
            // Calculate similarity scores with all games
            const gameScores = this.gameVectors.map(game => {
                const similarity = this.calculateCosineSimilarity(userVector, game.vector);
                return {
                    gameId: game.new_game_id,
                    similarity: similarity,
                    ...game
                };
            });

            // Sort by similarity and get top 8 recommendations
            const topRecommendations = gameScores
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 8);

            // Fetch game details from Steam
            const recommendations = await Promise.all(
                topRecommendations.map(async (rec) => {
                    const gameDetails = await this.getGameDetails(rec.gameId);
                    return {
                        appId: rec.gameId,
                        title: gameDetails.name || `Game ${rec.gameId}`,
                        price: this.formatPrice(gameDetails.price_overview),
                        score: Math.round(rec.similarity * 100),
                        matchPercentage: Math.round(rec.similarity * 100),
                        reason: `${Math.round(rec.similarity * 100)}% match based on your gaming preferences`,
                        tags: gameDetails.genres || [],
                        genres: gameDetails.categories || []
                    };
                })
            );

            return recommendations.filter(rec => rec.title !== `Game ${rec.appId}`);
        } catch (error) {
            console.error('Vector-based recommendation error:', error);
            throw error;
        }
    }

    async getUserAchievements(steamId) {
        try {
            // This would need to scrape achievements from Steam
            // For now, we'll simulate based on the games they own
            const profileData = await steamService.getProfileData(steamId);
            
            if (!profileData || !profileData.games || !profileData.games.list) {
                return [];
            }

            const achievements = [];
            
            // Simulate achievements based on games played
            profileData.games.list.forEach(game => {
                // Map common game achievements to our achievement cluster system
                const gameAchievements = this.mapGameToAchievements(game);
                achievements.push(...gameAchievements);
            });

            return achievements;
        } catch (error) {
            console.error('Error getting user achievements:', error);
            return [];
        }
    }

    mapGameToAchievements(game) {
        const achievements = [];
        const gameName = game.name.toLowerCase();
        const hoursPlayed = game.hoursPlayed || 0;
        
        // Map games to likely achievements based on genre and play time
        if (gameName.includes('counter') || gameName.includes('cs')) {
            if (hoursPlayed > 10) achievements.push({ name: 'First Blood', unlocked: true });
            if (hoursPlayed > 50) achievements.push({ name: 'Marksman Expert', unlocked: true });
            if (hoursPlayed > 100) achievements.push({ name: 'CQB Master', unlocked: true });
        }
        
        if (gameName.includes('civilization') || gameName.includes('civ')) {
            if (hoursPlayed > 20) achievements.push({ name: 'City Planner', unlocked: true });
            if (hoursPlayed > 100) achievements.push({ name: 'World Conquest', unlocked: true });
        }
        
        if (gameName.includes('terraria')) {
            if (hoursPlayed > 10) achievements.push({ name: 'Rock Bottom', unlocked: true });
            if (hoursPlayed > 50) achievements.push({ name: 'Slayer of Worlds', unlocked: true });
        }
        
        if (gameName.includes('stardew')) {
            if (hoursPlayed > 10) achievements.push({ name: 'Greenhorn', unlocked: true });
            if (hoursPlayed > 30) achievements.push({ name: 'Homesteader', unlocked: true });
            if (hoursPlayed > 100) achievements.push({ name: 'Master Angler', unlocked: true });
        }
        
        // Add general gaming achievements based on hours
        if (hoursPlayed > 1) achievements.push({ name: 'Getting Started', unlocked: true });
        if (hoursPlayed > 10) achievements.push({ name: 'Dedicated', unlocked: true });
        if (hoursPlayed > 50) achievements.push({ name: 'Veteran', unlocked: true });
        if (hoursPlayed > 100) achievements.push({ name: 'Expert', unlocked: true });
        
        return achievements;
    }

    generateUserVector(achievements) {
        const NUM_CLUSTERS = 78; // Based on your achievement cluster map
        const userVector = new Array(NUM_CLUSTERS).fill(0);
        
        achievements.forEach(achievement => {
            if (this.achievementMap[achievement.name] !== undefined) {
                const clusterId = this.achievementMap[achievement.name];
                if (achievement.unlocked) {
                    userVector[clusterId] += 1;
                } else {
                    userVector[clusterId] -= 0.2;
                }
            }
        });
        
        // Normalize the vector
        const magnitude = Math.sqrt(userVector.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            return userVector.map(val => val / magnitude);
        }
        
        return userVector;
    }

    calculateCosineSimilarity(vectorA, vectorB) {
        if (vectorA.length !== vectorB.length) {
            return 0;
        }
        
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        
        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            magnitudeA += vectorA[i] * vectorA[i];
            magnitudeB += vectorB[i] * vectorB[i];
        }
        
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }
        
        return dotProduct / (magnitudeA * magnitudeB);
    }

    async getGameDetails(appId) {
        try {
            // Try to get game details from Steam API
            const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}&format=json`, {
                timeout: 5000
            });
            
            const gameData = response.data[appId];
            if (gameData && gameData.success && gameData.data) {
                return gameData.data;
            }
            
            // Fallback to basic info
            return {
                name: `Game ${appId}`,
                price_overview: null,
                genres: [],
                categories: []
            };
        } catch (error) {
            console.error(`Error fetching details for game ${appId}:`, error.message);
            return {
                name: `Game ${appId}`,
                price_overview: null,
                genres: [],
                categories: []
            };
        }
    }

    generatePersonalizedRecommendations(userGames, profileData) {
        // Analyze user's gaming preferences
        const userPreferences = this.analyzeUserPreferences(userGames);
        
        // Score each game in database
        const scoredGames = this.fallbackGames.map(game => {
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

        // Sort by score and return top recommendations
        return scoredGames
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(game => ({
                appId: game.appId,
                title: game.title,
                price: game.price,
                score: game.score,
                matchPercentage: game.score,
                reason: game.reason,
                tags: game.tags,
                genres: game.genres
            }));
    }

    analyzeUserPreferences(userGames) {
        const preferences = {
            genres: {},
            totalHours: 0,
            avgHoursPerGame: 0,
            topGames: userGames.slice(0, 5)
        };

        userGames.forEach(game => {
            preferences.totalHours += game.hoursPlayed || 0;
            
            // Simple genre detection based on game names
            this.detectGameGenres(game.name).forEach(genre => {
                preferences.genres[genre] = (preferences.genres[genre] || 0) + (game.hoursPlayed || 1);
            });
        });

        preferences.avgHoursPerGame = userGames.length > 0 ? 
            preferences.totalHours / userGames.length : 0;

        return preferences;
    }

    detectGameGenres(gameName) {
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
        const owned = userGames.some(userGame => 
            userGame.name.toLowerCase().includes(game.title.toLowerCase()) ||
            game.title.toLowerCase().includes(userGame.name.toLowerCase())
        );
        
        return owned ? 50 : 0;
    }

    generateRecommendationReason(game, userPreferences) {
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
        return this.fallbackGames
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