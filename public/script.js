document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchForm = document.getElementById('searchForm');
    const steamIdInput = document.getElementById('steamId');
    const welcomeSection = document.getElementById('welcomeSection');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    const gamesGrid = document.getElementById('gamesGrid');
    const profileHeader = document.getElementById('profileHeader');
    const profileStats = document.getElementById('profileStats');
    const recentGames = document.getElementById('recentGames');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Event Listeners
    searchForm.addEventListener('submit', handleFormSubmit);

    // Handle form submission
    async function handleFormSubmit(e) {
        e.preventDefault();
        const steamId = steamIdInput.value.trim();
        
        if (!steamId) {
            showError('Please enter a valid Steam ID, profile URL, or username');
            return;
        }

        showLoading();
        hideMessages();

        try {
            // Fetch profile and recommendations concurrently
            const [profileData, recommendationsData] = await Promise.all([
                fetchUserProfile(steamId),
                fetchRecommendations(steamId)
            ]);

            // Display results
            displayUserProfile(profileData);
            displayRecommendations(recommendationsData.recommendations);
            
            const profileName = profileData.personaname || profileData.personaName || 'User';
            const recCount = recommendationsData.recommendations?.length || 0;
            showSuccess(`Successfully loaded ${profileName}'s profile! Found ${recCount} personalized recommendations.`);
            showResults();
            
        } catch (error) {
            console.error('Error fetching Steam data:', error);
            const errorMsg = error.message || 'Failed to fetch Steam data. Please check your Steam ID and ensure your profile is public.';
            showError(errorMsg);
            hideLoading();
        }
    }

    // Fetch user profile from API
    async function fetchUserProfile(steamId) {
        try {
            const response = await fetch(`/api/profile/${encodeURIComponent(steamId)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: Failed to fetch profile`);
            }
            
            return data;
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Network error: Unable to connect to server');
            }
            throw error;
        }
    }

    // Fetch recommendations from API
    async function fetchRecommendations(steamId) {
        try {
            const response = await fetch(`/api/recommendations/${encodeURIComponent(steamId)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: Failed to fetch recommendations`);
            }
            
            return data;
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Network error: Unable to connect to server');
            }
            throw error;
        }
    }

    // Display user profile information with accurate data
    function displayUserProfile(profile) {
        // Profile Header - Clean and simple
        const avatarUrl = profile.avatarUrl || profile.avatarMedium || profile.avatar || 
                         'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg';
        
        const displayName = profile.personaname || profile.personaName || profile.displayName || 'Steam User';
        const realName = profile.realName || profile.realname || '';
        const location = profile.location || profile.locCountryCode || '';
        const memberSince = profile.memberSince || profile.timecreated ? 
                           new Date(profile.timecreated * 1000).getFullYear() : '';

        const headerHtml = `
            <img src="${avatarUrl}" 
                 alt="Steam Avatar" 
                 class="profile-avatar"
                 onerror="this.src='https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg'">
            <div class="profile-info">
                <h3>${displayName}</h3>
                <div class="profile-details">
                    ${realName ? `${realName}<br>` : ''}
                    ${location ? `📍 ${location}<br>` : ''}
                    ${memberSince ? `Steam member since ${memberSince}` : ''}
                </div>
            </div>
        `;
        profileHeader.innerHTML = headerHtml;

        // Profile Stats - Only accurate data
        const totalGames = profile.games?.total || profile.gameCount || 0;
        const totalHours = Math.round(profile.games?.totalHours || profile.totalPlaytime || 0);
        const steamLevel = profile.level || 0;
        const recentGamesCount = profile.games?.recentGames?.length || 
                                profile.games?.list?.length || 0;

        const statsHtml = `
            <h4>Gaming Statistics</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${totalGames.toLocaleString()}</span>
                    <span class="stat-label">Games Owned</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${totalHours.toLocaleString()}</span>
                    <span class="stat-label">Hours Played</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${steamLevel}</span>
                    <span class="stat-label">Steam Level</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${recentGamesCount}</span>
                    <span class="stat-label">Games Library</span>
                </div>
            </div>
        `;
        profileStats.innerHTML = statsHtml;

        // Recent Games - Only show actual data
        const recentGamesData = profile.games?.recentGames || 
                               profile.games?.list?.slice(0, 8) || [];
        
        let recentGamesHtml = '<h4>Recently Played Games</h4><div class="recent-games-list">';
        
        if (recentGamesData.length > 0) {
            recentGamesHtml += recentGamesData.map(game => {
                const gameId = game.appId || game.appid || game.id || '';
                const gameName = game.name || 'Unknown Game';
                const gameHours = Math.round(game.hoursPlayed || game.hours_played || game.playtime_forever / 60 || 0);
                const gameIcon = game.logoUrl || game.iconUrl || game.img_logo_url || 
                               (gameId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/capsule_231x87.jpg` : '');

                return `
                    <div class="recent-game-item" onclick="openSteamStore('${gameId}')">
                        <img src="${gameIcon}" 
                             alt="${gameName}" 
                             class="recent-game-icon"
                             onerror="this.src='https://steamstore-a.akamaihd.net/public/images/v6/app_image_capsule.png'">
                        <div class="recent-game-info">
                            <div class="recent-game-name">${gameName}</div>
                            <div class="recent-game-hours">${gameHours.toLocaleString()} hours played</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            recentGamesHtml += `
                <div style="color: #8f98a0; text-align: center; padding: 20px; font-size: 12px;">
                    No recent games data available.<br>
                    Make sure your Steam profile and game details are set to public.
                </div>
            `;
        }
        
        recentGamesHtml += '</div>';
        recentGames.innerHTML = recentGamesHtml;
    }

    // Display game recommendations
    function displayRecommendations(recommendations) {
        if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
            gamesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #8f98a0; padding: 40px; font-size: 14px;">
                    <p>No personalized recommendations available at the moment.</p>
                    <p style="margin-top: 8px; font-size: 12px;">This could be due to a private profile or limited game data.</p>
                </div>
            `;
            return;
        }

        const html = recommendations.map(game => {
            const gameId = game.appid || game.appId || game.id || '';
            const gameName = game.name || game.title || 'Unknown Game';
            const gameImage = game.header_image || 
                            (gameId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/header.jpg` : '');

            return `
                <div class="game-capsule" onclick="openSteamStore('${gameId}')">
                    <div class="game-header">
                        <img src="${gameImage}" 
                             alt="${gameName}"
                             onerror="this.src='https://steamstore-a.akamaihd.net/public/images/v6/app_image_capsule.png'">
                    </div>
                    <div class="game-info">
                        <div class="game-title">${gameName}</div>
                        <div class="game-price">${formatPrice(game.price_overview)}</div>
                    </div>
                </div>
            `;
        }).join('');

        gamesGrid.innerHTML = html;
    }

    // Format price for display
    function formatPrice(priceOverview) {
        if (!priceOverview) return 'Free to Play';
        
        if (priceOverview.final === 0) return 'Free to Play';
        
        const currency = priceOverview.currency || 'USD';
        const price = priceOverview.final / 100;
        
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(price);
        } catch (error) {
            return `$${price.toFixed(2)}`;
        }
    }

    // Open Steam store page in new tab
    function openSteamStore(appId) {
        if (appId && appId !== '') {
            const url = `https://store.steampowered.com/app/${appId}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    // Show loading state
    function showLoading() {
        welcomeSection.style.display = 'none';
        loadingSection.style.display = 'block';
        resultsSection.style.display = 'none';
    }

    // Show results state
    function showResults() {
        welcomeSection.style.display = 'none';
        loadingSection.style.display = 'none';
        resultsSection.style.display = 'block';
    }

    // Hide loading state
    function hideLoading() {
        loadingSection.style.display = 'none';
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Auto-hide error after 10 seconds
        setTimeout(() => {
            hideMessages();
        }, 10000);
    }

    // Show success message
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Auto-hide success after 5 seconds
        setTimeout(() => {
            hideMessages();
        }, 5000);
    }

    // Hide all messages
    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    // Reset app to initial state (global function for onclick)
    window.resetApp = function() {
        welcomeSection.style.display = 'block';
        loadingSection.style.display = 'none';
        resultsSection.style.display = 'none';
        steamIdInput.value = '';
        hideMessages();
        
        // Clear all profile sections
        gamesGrid.innerHTML = '';
        profileHeader.innerHTML = '';
        profileStats.innerHTML = '';
        recentGames.innerHTML = '';
        
        // Focus back on input
        steamIdInput.focus();
    }

    // Focus on input when page loads
    steamIdInput.focus();

    // Add Enter key support for better UX
    steamIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchForm.dispatchEvent(new Event('submit'));
        }
    });
});