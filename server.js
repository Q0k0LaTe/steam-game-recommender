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
app.get('/api/recommendations/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`[API] Getting recommendations for Steam ID: ${steamId}`);
        
        // Get profile data first
        const profileData = await steamService.getProfileData(steamId);
        
        if (!profileData) {
            return res.status(404).json({ 
                error: 'Steam profile not found or is private.' 
            });
        }
        
        console.log(`[API] Profile found for ${profileData.personaName}, running vector algorithm...`);
        
        // This is where we call: print(niu_bi_de_han_shu(userid))
        // The recommendationService.getRecommendations() will internally call niuBiDeHanShu()
        const recommendations = await recommendationService.getRecommendations(steamId);
        
        console.log(`[API] Generated ${recommendations.length} recommendations`);
        
        // Format response
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
                price_overview: this.parsePriceToOverview(game.price),
                score: game.score,
                matchPercentage: game.matchPercentage,
                reason: game.reason,
                tags: game.tags,
                genres: game.genres
            })),
            metadata: {
                recommendationType: this.detectRecommendationType(recommendations),
                generatedAt: new Date().toISOString(),
                totalRecommendations: recommendations.length,
                vectorAlgorithm: true
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

// Helper function to parse price string back to price_overview format
function parsePriceToOverview(priceString) {
    if (!priceString || priceString === 'Free to Play' || priceString === 'Unknown') {
        return { final: 0, currency: 'USD' };
    }
    
    // Extract price from string like "$29.99"
    const priceMatch = priceString.match(/[\d.]+/);
    if (priceMatch) {
        const price = parseFloat(priceMatch[0]);
        return {
            final: Math.round(price * 100), // Convert to cents
            currency: 'USD'
        };
    }
    
    return { final: 0, currency: 'USD' };
}

// Helper function to detect recommendation type
function detectRecommendationType(recommendations) {
    if (!recommendations || recommendations.length === 0) {
        return 'fallback';
    }
    
    // Check if any recommendations have AI/vector-based reasons
    const hasVectorBased = recommendations.some(rec => 
        rec.reason && (
            rec.reason.includes('🤖') || 
            rec.reason.includes('AI-powered') ||
            rec.matchPercentage >= 90
        )
    );
    
    return hasVectorBased ? 'vector-ai' : 'general';
}

// Test endpoint to directly test the vector algorithm
app.get('/api/test-vector/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`[Test] Testing vector algorithm for Steam ID: ${steamId}`);
        
        // Direct call to the vector algorithm - equivalent to print(niu_bi_de_han_shu(userid))
        const gameIds = await recommendationService.niuBiDeHanShu(steamId);
        
        res.json({
            steamId: steamId,
            vectorResults: gameIds,
            message: `Vector algorithm returned ${gameIds.length} game recommendations`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Test] Vector algorithm test failed:', error);
        res.status(500).json({
            error: 'Vector algorithm test failed',
            details: error.message,
            steamId: req.params.steamId
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'SteamForge Game Recommender with Vector AI',
        version: '2.0.0'
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
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
                'GET /api/recommendations/:steamId', 
                'GET /api/test-vector/:steamId',
                'GET /api/health',
                'GET /api/status'
            ],
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
            'GET /api/test-vector/:steamId',
            'GET /api/health',
            'GET /api/status'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 SteamForge Game Recommender v2.0 running on http://localhost:${PORT}`);
    console.log(`🤖 Vector-based AI recommendations enabled`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🧪 Test vector algorithm: http://localhost:${PORT}/api/test-vector/:steamId`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
});