const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const steamService = require('./services/steamService');
const recommendationService = require('./services/recommendationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get Steam profile data
app.get('/api/profile/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`[Profile] Fetching profile for Steam ID: ${steamId}`);
        
        const profileData = await steamService.getProfileData(steamId);
        
        if (!profileData) {
            return res.status(404).json({ 
                error: 'Steam profile not found or is private. Please make sure your profile is public.' 
            });
        }
        
        console.log(`[Profile] Successfully retrieved profile for ${profileData.personaName}`);
        res.json(profileData);
    } catch (error) {
        console.error('[Profile] Error fetching Steam profile:', error);
        res.status(500).json({ 
            error: 'Failed to fetch Steam profile. Please check the Steam ID and try again.' 
        });
    }
});

// Get game recommendations with vector integration
app.get('/api/recommendations/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`[Recommendations] Getting recommendations for Steam ID: ${steamId}`);
        
        // Get profile data first
        const profileData = await steamService.getProfileData(steamId);
        
        if (!profileData) {
            return res.status(404).json({ 
                error: 'Steam profile not found or is private.' 
            });
        }
        
        console.log(`[Recommendations] Profile found for ${profileData.personaName}, generating recommendations...`);
        
        // Get recommendations using the enhanced service
        const recommendations = await recommendationService.getRecommendations(steamId);
        
        console.log(`[Recommendations] Generated ${recommendations.length} recommendations`);
        
        // Enhanced response formatting with better game data
        const formattedRecommendations = await Promise.all(
            recommendations.map(async (game) => {
                try {
                    // Try to get more detailed game information
                    const gameDetails = await getEnhancedGameDetails(game.appId);
                    
                    return {
                        appid: game.appId,
                        name: game.title,
                        header_image: gameDetails.header_image || 
                                    `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
                        price_overview: gameDetails.price_overview || {
                            final: parseFloat(game.price?.replace(/[^0-9.]/g, '')) * 100 || 0,
                            currency: 'USD'
                        },
                        score: game.score || game.matchPercentage || 0,
                        matchPercentage: game.matchPercentage || game.score || 0,
                        reason: game.reason || 'Recommended for you',
                        tags: game.tags || gameDetails.genres || [],
                        genres: game.genres || gameDetails.categories || []
                    };
                } catch (detailError) {
                    console.warn(`[Recommendations] Could not get enhanced details for game ${game.appId}:`, detailError.message);
                    
                    // Return basic formatted game data
                    return {
                        appid: game.appId,
                        name: game.title,
                        header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
                        price_overview: {
                            final: parseFloat(game.price?.replace(/[^0-9.]/g, '')) * 100 || 0,
                            currency: 'USD'
                        },
                        score: game.score || game.matchPercentage || 0,
                        matchPercentage: game.matchPercentage || game.score || 0,
                        reason: game.reason || 'Recommended for you',
                        tags: game.tags || [],
                        genres: game.genres || []
                    };
                }
            })
        );

        // Format the complete response
        const formattedResponse = {
            profile: {
                personaname: profileData.personaName,
                avatarUrl: profileData.avatarUrl,
                gameCount: profileData.games?.total || 0,
                level: profileData.level || 0,
                totalPlaytime: Math.round((profileData.games?.totalHours || 0) * 10) / 10,
                memberSince: profileData.memberSince,
                joinYear: profileData.joinYear,
                yearsOfService: profileData.yearsOfService,
                realName: profileData.realName,
                location: profileData.location,
                games: profileData.games
            },
            recommendations: formattedRecommendations,
            metadata: {
                recommendationType: detectRecommendationType(recommendations),
                generatedAt: new Date().toISOString(),
                totalRecommendations: formattedRecommendations.length
            }
        };

        console.log(`[Recommendations] Successfully formatted ${formattedRecommendations.length} recommendations`);
        res.json(formattedResponse);
        
    } catch (error) {
        console.error('[Recommendations] Error getting recommendations:', error);
        res.status(500).json({ 
            error: 'Failed to generate recommendations. Please try again.' 
        });
    }
});

// Helper function to get enhanced game details
async function getEnhancedGameDetails(appId) {
    try {
        const axios = require('axios');
        
        // Try Steam Store API first
        const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}&format=json`, {
            timeout: 8000,
            headers: {
                'User-Agent': 'SteamForge Game Recommendation Service'
            }
        });
        
        const gameData = response.data[appId];
        if (gameData && gameData.success && gameData.data) {
            return {
                header_image: gameData.data.header_image,
                price_overview: gameData.data.price_overview,
                genres: gameData.data.genres?.map(g => g.description) || [],
                categories: gameData.data.categories?.map(c => c.description) || [],
                short_description: gameData.data.short_description,
                release_date: gameData.data.release_date
            };
        }
        
        throw new Error('Steam API returned no data');
        
    } catch (apiError) {
        console.warn(`[GameDetails] Steam API failed for ${appId}, using fallback:`, apiError.message);
        
        // Fallback to basic structure
        return {
            header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
            price_overview: null,
            genres: [],
            categories: [],
            short_description: '',
            release_date: null
        };
    }
}

// Helper function to detect recommendation type
function detectRecommendationType(recommendations) {
    if (!recommendations || recommendations.length === 0) {
        return 'fallback';
    }
    
    // Check if any recommendations have vector-based reasons
    const hasVectorBased = recommendations.some(rec => 
        rec.reason && (
            rec.reason.includes('match based on') || 
            rec.reason.includes('% match') ||
            rec.matchPercentage > 90
        )
    );
    
    if (hasVectorBased) {
        return 'vector-ai';
    }
    
    // Check if recommendations seem personalized
    const hasPersonalized = recommendations.some(rec => 
        rec.reason && (
            rec.reason.includes('Based on your') ||
            rec.reason.includes('interest in')
        )
    );
    
    return hasPersonalized ? 'personalized' : 'general';
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'SteamForge Game Recommender',
        version: '2.0.0'
    });
});

// API status endpoint
app.get('/api/status', async (req, res) => {
    try {
        // Check if vector data is loaded
        const vectorStatus = recommendationService.gameVectors ? 'loaded' : 'not_loaded';
        const achievementStatus = recommendationService.achievementMap ? 'loaded' : 'not_loaded';
        
        res.json({
            status: 'operational',
            components: {
                steamService: 'operational',
                recommendationService: 'operational',
                vectorSystem: vectorStatus,
                achievementSystem: achievementStatus
            },
            statistics: {
                gameVectors: recommendationService.gameVectors?.length || 0,
                achievementMappings: recommendationService.achievementMap ? 
                    Object.keys(recommendationService.achievementMap).length : 0
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'degraded',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Debug endpoint for development
if (process.env.NODE_ENV === 'development') {
    app.get('/api/debug/:steamId', async (req, res) => {
        try {
            const { steamId } = req.params;
            
            console.log(`[Debug] Debug request for Steam ID: ${steamId}`);
            
            const profileData = await steamService.getProfileData(steamId);
            const recommendations = await recommendationService.getRecommendations(steamId);
            
            res.json({
                debug: true,
                steamId,
                profile: profileData,
                recommendations,
                vectorSystemStatus: {
                    gameVectors: recommendationService.gameVectors ? 'loaded' : 'not_loaded',
                    achievementMap: recommendationService.achievementMap ? 'loaded' : 'not_loaded'
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                debug: true,
                error: error.message,
                stack: error.stack
            });
        }
    });
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('[Server] Unhandled error:', error);
    
    res.status(500).json({
        error: 'Internal server error occurred',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /api/profile/:steamId',
            'GET /api/recommendations/:steamId',
            'GET /api/health',
            'GET /api/status'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 SteamForge Game Recommender v2.0 running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🤖 AI-powered vector recommendations enabled`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`🐛 Debug endpoint: http://localhost:${PORT}/api/debug/:steamId`);
    }
});