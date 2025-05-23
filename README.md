# Steam Game Recommender

A web application that provides personalized game recommendations based on real Steam profile data. Built with Node.js and vanilla JavaScript with an authentic Steam-like interface.

## Features

- **Real Steam Profile Data**: Fetches actual profile information including games, hours played, level, and achievements
- **Personalized Recommendations**: AI-powered recommendations based on your gaming preferences and history
- **Steam-like UI**: Authentic Steam interface design with dark theme and signature styling
- **Flexible Input**: Accepts Steam ID64, profile URLs, or custom usernames
- **Responsive Design**: Works on desktop and mobile devices

## Screenshots

The application features a Steam-inspired dark interface with:
- Steam-style navigation and sections
- Real profile data display with avatar and stats
- Game recommendation cards with match percentages
- Loading animations and error handling

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd steam-game-recommender
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   - `PORT`: Server port (default: 3000)
   - `STEAM_API_KEY`: Optional Steam API key for enhanced features

4. **Start the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### GET `/api/profile/:steamId`
Fetch Steam profile data for a given Steam ID.

**Parameters:**
- `steamId`: Steam ID64, profile URL, or custom username

**Response:**
```json
{
  "steamId64": "76561198037867621",
  "personaName": "PlayerName",
  "avatarUrl": "https://...",
  "level": 25,
  "games": {
    "total": 150,
    "totalHours": 2500.5,
    "recentGames": [...]
  }
}
```

### GET `/api/recommendations/:steamId`
Get personalized game recommendations.

**Response:**
```json
{
  "profile": { ... },
  "recommendations": [
    {
      "title": "Game Name",
      "matchPercentage": 87,
      "price": "$29.99",
      "tags": ["RPG", "Action"],
      "reason": "Based on your interest in RPG games"
    }
  ]
}
```

## How It Works

### Profile Data Extraction
1. **Steam ID Resolution**: Converts various Steam ID formats to SteamID64
2. **Profile Scraping**: Uses web scraping to extract profile data from Steam Community pages
3. **Games Analysis**: Fetches owned games list and playing statistics
4. **Stats Extraction**: Gathers level, achievements, and other profile metrics

### Recommendation Engine
1. **Preference Analysis**: Analyzes user's game library to determine preferences
2. **Genre Matching**: Matches games based on preferred genres and tags
3. **Smart Scoring**: Combines base game ratings with personalized preference scores
4. **Ownership Filtering**: Excludes games already owned by the user

## Project Structure

```
steam-game-recommender/
├── server.js                 # Main Express server
├── services/
│   ├── steamService.js       # Steam data fetching and scraping
│   └── recommendationService.js # Game recommendation logic
├── public/
│   └── index.html           # Frontend interface
├── package.json             # Dependencies and scripts
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Steam Profile Requirements

For the application to work properly:
1. **Public Profile**: Your Steam profile must be set to public
2. **Public Game Details**: Your game details should be visible to public
3. **Valid Profile**: The profile must exist and be accessible

## Technical Details

### Backend (Node.js)
- **Express.js**: Web server framework
- **Axios**: HTTP client for web requests
- **Cheerio**: Server-side HTML parsing and scraping
- **CORS**: Cross-origin resource sharing

### Frontend (Vanilla JavaScript)
- **Steam-inspired CSS**: Authentic Steam styling with gradients and colors
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Dynamic content loading and error handling
- **Steam Integration**: Direct links to Steam store pages

### Data Sources
- **Steam Community**: Profile and games data via web scraping
- **Steam Store**: Game information and statistics
- **Internal Database**: Curated game database with metadata

## Development

### Adding New Games
Edit `services/recommendationService.js` and add games to the `gameDatabase` array:

```javascript
{
  title: "Game Name",
  tags: ["Genre1", "Genre2"],
  genres: ["Action", "RPG"],
  score: 90,
  price: "$49.99",
  icon: "🎮",
  gradient: "linear-gradient(135deg, #color1, #color2)",
  appId: "steam_app_id"
}
```

### Customizing Recommendations
Modify the recommendation algorithm in `recommendationService.js`:
- `analyzeUserPreferences()`: Customize preference detection
- `calculatePreferenceScore()`: Adjust scoring algorithm
- `generatePersonalizedRecommendations()`: Modify recommendation logic

## Limitations

- **Rate Limiting**: Steam Community may rate-limit requests
- **Private Profiles**: Cannot access data from private profiles
- **Scraping Dependency**: Relies on Steam's HTML structure (may break with updates)
- **No Real-time Data**: Profile data is fetched on-demand, not cached

## Troubleshooting

### Common Issues

1. **"Profile not found"**
   - Ensure the Steam ID is correct
   - Check that the profile is public
   - Try using the full profile URL

2. **"Failed to fetch recommendations"**
   - Check your internet connection
   - Verify the Steam Community is accessible
   - Try again after a few minutes (rate limiting)

3. **Missing game data**
   - Ensure game details are public in Steam privacy settings
   - Some games may not be visible if purchased recently

### Debug Mode
Set `NODE_ENV=development` in your `.env` file for detailed console logging.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Steam privacy settings
3. Create an issue on GitHub with detailed information