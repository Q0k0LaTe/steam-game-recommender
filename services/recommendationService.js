const steamService = require('./steamService');

class RecommendationService {
    constructor() {
        // Predefined game database with genres and tags
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

    async getRecommendations(steamId) {
        try {
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

    generatePersonalizedRecommendations(userGames, profileData) {
        // Analyze user's gaming preferences
        const userPreferences = this.analyzeUserPreferences(userGames);
        
        // Score each game in database
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

        // Sort by score and return top recommendations
        return scoredGames
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(game => ({
                ...game,
                matchPercentage: game.score
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
        
        // Simple keyword-based genre detection
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
        
        return genres.length > 0 ? genres : ['Action']; // Default to Action
    }

    calculatePreferenceScore(game, userPreferences) {
        let score = 50; // Base score
        
        // Genre matching
        game.genres.forEach(genre => {
            if (userPreferences.genres[genre]) {
                score += Math.min(20, userPreferences.genres[genre] / 10);
            }
        });

        // Tag matching
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
        
        return owned ? 50 : 0; // Heavy penalty for owned games
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

    getFallbackRecommendations() {
        // Return top-rated games when no user data is available
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