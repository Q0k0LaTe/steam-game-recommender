const axios = require('axios');
const vectorAlgorithm = require('./vectorAlgorithm');

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

    /**
     * Main entry point - equivalent to: print(niu_bi_de_han_shu(User_ID))
     */
    async getRecommendations(steamId) {
        try {
            console.log(`[Recommendations] Getting recommendations for Steam ID: ${steamId}`);
            
            // This is the direct equivalent of: print(niu_bi_de_han_shu(User_ID))
            const vectorGameIds = await vectorAlgorithm.niuBiDeHanShu(steamId);
            
            if (vectorGameIds && vectorGameIds.length > 0) {
                console.log(`[Recommendations] Vector algorithm returned ${vectorGameIds.length} game IDs:`, vectorGameIds);
                
                // Convert game IDs to recommendation objects for frontend
                const recommendations = await this.convertGameIdsToRecommendations(vectorGameIds);
                
                if (recommendations.length > 0) {
                    return recommendations;
                }
            }
            
            // Fallback if vector algorithm fails
            console.log('[Recommendations] Using fallback recommendations');
            return this.getFallbackRecommendations();
            
        } catch (error) {
            console.error('[Recommendations] Error in vector algorithm:', error);
            return this.getFallbackRecommendations();
        }
    }

    /**
     * Direct access to the Python algorithm - for testing
     * This is exactly: niu_bi_de_han_shu(player_id)
     */
    async niuBiDeHanShu(playerId) {
        return await vectorAlgorithm.niuBiDeHanShu(playerId);
    }

    /**
     * Convert game IDs from vector algorithm to recommendation objects for frontend
     */
    async convertGameIdsToRecommendations(gameIds) {
        const recommendations = [];
        
        for (let i = 0; i < gameIds.length; i++) {
            const gameId = gameIds[i];
            
            try {
                const gameDetails = await this.fetchGameDetailsFromSteam(gameId);
                
                if (gameDetails && gameDetails.name) {
                    recommendations.push({
                        appId: gameId,
                        title: gameDetails.name,
                        price: this.formatGamePrice(gameDetails.price_overview),
                        score: 95 - i, // Decreasing score based on ranking
                        matchPercentage: 95 - i,
                        reason: "🤖 AI-powered recommendation based on your achievement patterns",
                        tags: gameDetails.genres || [],
                        genres: gameDetails.categories || []
                    });
                } else {
                    // Add basic entry if Steam API fails
                    recommendations.push({
                        appId: gameId,
                        title: `Recommended Game ${gameId}`,
                        price: "Unknown",
                        score: 90 - i,
                        matchPercentage: 90 - i,
                        reason: "🤖 AI-powered recommendation",
                        tags: [],
                        genres: []
                    });
                }
                
            } catch (error) {
                console.warn(`[Convert] Failed to get details for game ${gameId}:`, error.message);
                
                recommendations.push({
                    appId: gameId,
                    title: `Game ${gameId}`,
                    price: "Unknown",
                    score: 85 - i,
                    matchPercentage: 85 - i,
                    reason: "🤖 Vector-based recommendation",
                    tags: [],
                    genres: []
                });
            }
        }
        
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