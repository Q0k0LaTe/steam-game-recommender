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
                error: 'Unable to fetch Steam profile. Please check:\n• Steam ID is correct\n• Profile is set to public\n• Steam Community is accessible',
                suggestions: [
                    'Make sure your Steam profile is public',
                    'Try using your full Steam profile URL',
                    'Check if Steam Community is down',
                    'Wait a few minutes and try again'
                ]
            });
        }
        
        res.json(profileData);
    } catch (error) {
        console.error('Error fetching Steam profile:', error.message);
        
        let errorMessage = 'Failed to fetch Steam profile. ';
        let suggestions = [];
        
        if (error.message.includes('timeout')) {
            errorMessage += 'Connection timed out.';
            suggestions = [
                'Steam Community might be slow or down',
                'Check your internet connection',
                'Try again in a few minutes',
                'Use a VPN if Steam is blocked in your region'
            ];
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage += 'Cannot connect to Steam.';
            suggestions = [
                'Check your internet connection',
                'Steam Community might be down',
                'Try using a different network',
                'Wait and try again later'
            ];
        } else {
            errorMessage += 'Please try again.';
            suggestions = [
                'Verify the Steam ID is correct',
                'Make sure the profile is public',
                'Try again in a few moments'
            ];
        }
        
        res.status(500).json({ 
            error: errorMessage,
            suggestions: suggestions,
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get game recommendations
app.get('/api/recommendations/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        console.log(`Getting recommendations for Steam ID: ${steamId}`);
        
        // Add timeout to the entire operation
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out after 60 seconds')), 60000);
        });
        
        const dataPromise = Promise.all([
            steamService.getProfileData(steamId),
            recommendationService.getRecommendations(steamId)
        ]);
        
        const [profileData, recommendations] = await Promise.race([dataPromise, timeoutPromise]);
        
        if (!profileData) {
            return res.status(404).json({ 
                error: 'Unable to fetch Steam profile data',
                suggestions: [
                    'Verify your Steam ID is correct',
                    'Make sure your Steam profile is public',
                    'Check Steam Community accessibility',
                    'Try again in a few minutes'
                ]
            });
        }
        
        res.json({
            profile: profileData,
            recommendations: recommendations
        });
    } catch (error) {
        console.error('Error getting recommendations:', error.message);
        
        let errorMessage = 'Failed to generate recommendations. ';
        let suggestions = [];
        
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
            errorMessage += 'The request took too long.';
            suggestions = [
                'Steam servers might be slow',
                'Try a different Steam ID format',
                'Wait a few minutes and try again',
                'Check if Steam Community is accessible'
            ];
        } else {
            errorMessage += 'Please try again.';
            suggestions = [
                'Make sure the Steam ID is valid',
                'Ensure your profile is public',
                'Try again in a moment'
            ];
        }
        
        res.status(500).json({ 
            error: errorMessage,
            suggestions: suggestions,
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}); recommendations
        });
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