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

// Get game recommendations using vector algorithm
// This endpoint calls: print(niu_bi_de_han_shu(userid))
app.get('/api/recommendations/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`[API] Getting vector-based recommendations for Steam ID: ${steamId}`);
        
        // Get profile data first
        const profileData = await steamService.getProfileData(steamId);
        
        if (!profileData) {
            return res.status(404).json({ 
                error: 'Steam profile not found or is private.' 
            });
        }
        
        console.log(`[API] Profile found for ${profileData.personaName}, running vector algorithm...`);
        
        // This calls the exact Python algorithm: niu_bi_de_han_shu(steamId)
        const recommendations = await recommendationService.getRecommendations(steamId);
        
        console.log(`[API] Generated ${recommendations.length} recommendations`);
        
        // Format response for frontend
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
            recommendations: recommendations.map(game => ({
                appid: game.appId,
                name: game.title,
                header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
                price_overview: parsePriceToOverview(game.price),
                score: game.score,
                matchPercentage: game.matchPercentage,
                reason: game.reason,
                tags: game.tags,
                genres: game.genres
            })),
            metadata: {
                recommendationType: 'vector-ai',
                generatedAt: new Date().toISOString(),
                totalRecommendations: recommendations.length,
                vectorAlgorithm: true,
                pythonEquivalent: `niu_bi_de_han_shu(${steamId})`
            }
        };

        res.json(formattedResponse);
        
    } catch (error) {
        console.error('[API] Error getting recommendations:', error);
        res.status(500).json({ 
            error: 'Failed to generate recommendations. Please try again.' 
        });
    }
});

// Direct test endpoint - exactly equivalent to: print(niu_bi_de_han_shu(User_ID))
app.get('/api/vector-test/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`[Vector Test] Running niu_bi_de_han_shu(${steamId})`);
        
        // This is the EXACT equivalent of your Python: print(niu_bi_de_han_shu(User_ID))
        const gameIds = await recommendationService.niuBiDeHanShu(steamId);
        
        console.log(`[Vector Test] Result: ${JSON.stringify(gameIds)}`);
        
        res.json({
            steamId: steamId,
            pythonFunction: `niu_bi_de_han_shu(${steamId})`,
            result: gameIds,
            resultType: 'Array of Game IDs',
            message: `Vector algorithm returned ${gameIds.length} game recommendations`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Vector Test] Error:', error);
        res.status(500).json({
            error: 'Vector algorithm test failed',
            details: error.message,
            steamId: req.params.steamId
        });
    }
});

// Helper function to parse price string back to price_overview format
function parsePriceToOverview(priceString) {
    if (!priceString || priceString === 'Free to Play' || priceString === 'Unknown') {
        return { final: 0, currency: 'USD' };
    }
    
    const priceMatch = priceString.match(/[\d.]+/);
    if (priceMatch) {
        const price = parseFloat(priceMatch[0]);
        return {
            final: Math.round(price * 100),
            currency: 'USD'
        };
    }
    
    return { final: 0, currency: 'USD' };
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'SteamForge Game Recommender with Vector AI',
        version: '2.0.0',
        pythonAlgorithm: 'niu_bi_de_han_shu() - Fully Integrated'
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    try {
        const fs = require('fs');
        
        // Check if vector data files exist
        const achievementMapExists = fs.existsSync(path.join(__dirname, 'achievement_cluster_map.json'));
        const gameVectorExists = fs.existsSync(path.join(__dirname, 'new_game_vector.json'));
        
        res.json({
            status: 'operational',
            components: {
                steamService: 'operational',
                recommendationService: 'operational',
                vectorAlgorithm: achievementMapExists && gameVectorExists ? 'loaded' : 'missing_files'
            },
            vectorData: {
                achievementMap: achievementMapExists ? 'found' : 'missing',
                gameVectors: gameVectorExists ? 'found' : 'missing'
            },
            endpoints: [
                'GET /api/profile/:steamId',
                'GET /api/recommendations/:steamId - Calls niu_bi_de_han_shu()', 
                'GET /api/vector-test/:steamId - Direct Python equivalent',
                'GET /api/health',
                'GET /api/status'
            ],
            pythonIntegration: {
                mainFunction: 'niu_bi_de_han_shu(player_id)',
                translatedTo: 'JavaScript with zero algorithm changes',
                testEndpoint: '/api/vector-test/:steamId'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

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
            'GET /api/vector-test/:steamId - Direct Python algorithm test',
            'GET /api/health',
            'GET /api/status'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 SteamForge Game Recommender v2.0 running on http://localhost:${PORT}`);
    console.log(`🤖 Python Vector Algorithm: niu_bi_de_han_shu() - Integrated`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🧪 Test Python algorithm directly: http://localhost:${PORT}/api/vector-test/:steamId`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📁 Required files: achievement_cluster_map.json, new_game_vector.json`);
});