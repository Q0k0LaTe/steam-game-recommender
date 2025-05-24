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
        console.log(`Fetching profile for Steam ID: ${steamId}`);
        
        const profileData = await steamService.getProfileData(steamId);
        
        if (!profileData) {
            return res.status(404).json({ 
                error: 'Steam profile not found or is private. Please make sure your profile is public.' 
            });
        }
        
        res.json(profileData);
    } catch (error) {
        console.error('Error fetching Steam profile:', error);
        res.status(500).json({ 
            error: 'Failed to fetch Steam profile. Please check the Steam ID and try again.' 
        });
    }
});

// Get game recommendations
app.get('/api/recommendations/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`Getting recommendations for Steam ID: ${steamId}`);
        
        const profileData = await steamService.getProfileData(steamId);
        
        if (!profileData) {
            return res.status(404).json({ 
                error: 'Steam profile not found or is private.' 
            });
        }

        const recommendations = await recommendationService.getRecommendations(steamId);
        
        // Format the response data
        const formattedResponse = {
            profile: {
                personaname: profileData.personaName,
                avatarUrl: profileData.avatarUrl,
                gameCount: profileData.games?.total || 0,
                level: profileData.level || 0,
                totalPlaytime: Math.round((profileData.games?.totalHours || 0) * 10) / 10,
                memberSince: profileData.memberSince,
                realName: profileData.realName,
                location: profileData.location,
                games: profileData.games
            },
            recommendations: recommendations.map(game => ({
                appid: game.appId,
                name: game.title,
                header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
                price_overview: {
                    final: parseFloat(game.price.replace(/[^0-9.]/g, '')) * 100 || 0,
                    currency: 'USD'
                }
            }))
        };

        res.json(formattedResponse);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ 
            error: 'Failed to generate recommendations. Please try again.' 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🎮 Steam Game Recommender running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
});