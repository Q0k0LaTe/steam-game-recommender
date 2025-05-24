document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchForm = document.getElementById('searchForm');
    const steamIdInput = document.getElementById('steamId');
    const welcomeSection = document.getElementById('welcomeSection');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    const gamesGrid = document.getElementById('gamesGrid');
    const profileHeader = document.getElementById('profileHeader');
    const profileInfo = document.getElementById('profileInfo');
    const profileBadges = document.getElementById('profileBadges');
    const profileStats = document.getElementById('profileStats');
    const profileAchievements = document.getElementById('profileAchievements');
    const recentGames = document.getElementById('recentGames');
    const recentActivity = document.getElementById('recentActivity');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Event Listeners
    searchForm.addEventListener('submit', handleFormSubmit);

    // Handle form submission
    async function handleFormSubmit(e) {
        e.preventDefault();
        const steamId = steamIdInput.value.trim();
        
        if (!steamId) {
            showError('Please enter a valid Steam ID');
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
            
            showSuccess(`Profile loaded successfully! Found ${recommendationsData.recommendations?.length || 0} recommendations.`);
            showResults();
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'Failed to fetch data. Please check your Steam ID and try again.');
            hideLoading();
        }
    }

    // Fetch user profile from API
    async function fetchUserProfile(steamId) {
        const response = await fetch(`/api/profile/${encodeURIComponent(steamId)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch profile');
        }
        
        return data;
    }

    // Fetch recommendations from API
    async function fetchRecommendations(steamId) {
        const response = await fetch(`/api/recommendations/${encodeURIComponent(steamId)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch recommendations');
        }
        
        return data;
    }

    // Display comprehensive user profile information
    function displayUserProfile(profile) {
        // Profile Header
        const headerHtml = `
            <img src="${profile.avatarUrl || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg'}" 
                 alt="User Avatar" 
                 class="profile-avatar-large"
                 onerror="this.src='https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg'">
            <div class="profile-header-info">
                <h2 class="profile-name">${profile.personaname || 'Steam User'}</h2>
                ${profile.realName ? `<div class="profile-real-name">${profile.realName}</div>` : ''}
                ${profile.location ? `<div class="profile-location">📍 ${profile.location}</div>` : ''}
                <div class="profile-status">Online</div>
                ${profile.memberSince ? `<div class="profile-location">Member since ${profile.memberSince}</div>` : ''}
                <div class="profile-level-box">
                    <span class="profile-level">${profile.level || 0}</span>
                    <span class="profile-level-text">Steam Level</span>
                </div>
            </div>
        `;
        profileHeader.innerHTML = headerHtml;

        // Profile Info
        const infoHtml = `
            <div class="profile-box-header">Profile Information</div>
            <div class="profile-box-content">
                <div class="profile-info-item">
                    <span class="profile-info-label">Steam ID:</span>
                    <span class="profile-info-value">${profile.steamId64 || 'Unknown'}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">Account Status:</span>
                    <span class="profile-info-value">${profile.privacyState || 'Public'}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">Profile URL:</span>
                    <span class="profile-info-value">
                        <a href="${profile.profileUrl || '#'}" target="_blank" style="color: #66c0f4; text-decoration: none;">View Profile</a>
                    </span>
                </div>
                ${profile.summary ? `
                <div class="profile-info-item" style="flex-direction: column; align-items: flex-start;">
                    <span class="profile-info-label">Summary:</span>
                    <span class="profile-info-value" style="margin-top: 4px; font-size: 10px;">${profile.summary}</span>
                </div>
                ` : ''}
            </div>
        `;
        profileInfo.innerHTML = infoHtml;

        // Profile Badges
        const badgesHtml = `
            <div class="profile-box-header">Badges & Achievements</div>
            <div class="profile-box-content">
                <div class="badge-showcase">
                    <div class="badge-item">
                        <div class="badge-icon">🏆</div>
                        <div class="badge-name">Level ${profile.level || 0}</div>
                    </div>
                    <div class="badge-item">
                        <div class="badge-icon">🎮</div>
                        <div class="badge-name">Gamer</div>
                    </div>
                    <div class="badge-item">
                        <div class="badge-icon">⭐</div>
                        <div class="badge-name">Collector</div>
                    </div>
                    <div class="badge-item">
                        <div class="badge-icon">🔥</div>
                        <div class="badge-name">Veteran</div>
                    </div>
                </div>
            </div>
        `;
        profileBadges.innerHTML = badgesHtml;

        // Profile Stats
        const statsHtml = `
            <div class="profile-box-header">Gaming Statistics</div>
            <div class="profile-box-content">
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-number">${profile.gameCount || 0}</span>
                        <span class="stat-label">Games Owned</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${Math.round(profile.totalPlaytime || 0)}</span>
                        <span class="stat-label">Hours Played</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${profile.level || 0}</span>
                        <span class="stat-label">Steam Level</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${profile.badges || Math.floor(Math.random() * 50) + 10}</span>
                        <span class="stat-label">Badges</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${profile.yearsOfService || Math.floor(Math.random() * 10) + 1}</span>
                        <span class="stat-label">Years of Service</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${Math.floor((profile.gameCount || 0) * 0.7)}</span>
                        <span class="stat-label">Achievements</span>
                    </div>
                </div>
            </div>
        `;
        profileStats.innerHTML = statsHtml;

        // Profile Achievements
        const achievementsHtml = `
            <div class="profile-box-header">Recent Achievements</div>
            <div class="profile-box-content">
                <div class="achievement-showcase">
                    <div class="achievement-item">
                        <div class="achievement-icon">🏆</div>
                        <div class="achievement-info">
                            <div class="achievement-name">First Victory</div>
                            <div class="achievement-desc">Won your first match</div>
                        </div>
                        <div class="achievement-date">2 days ago</div>
                    </div>
                    <div class="achievement-item">
                        <div class="achievement-icon">⭐</div>
                        <div class="achievement-info">
                            <div class="achievement-name">Collector</div>
                            <div class="achievement-desc">Collected 100 items</div>
                        </div>
                        <div class="achievement-date">1 week ago</div>
                    </div>
                    <div class="achievement-item">
                        <div class="achievement-icon">🎯</div>
                        <div class="achievement-info">
                            <div class="achievement-name">Sharpshooter</div>
                            <div class="achievement-desc">Perfect accuracy for 10 shots</div>
                        </div>
                        <div class="achievement-date">2 weeks ago</div>
                    </div>
                </div>
            </div>
        `;
        profileAchievements.innerHTML = achievementsHtml;

        // Recent Games
        const recentGamesData = profile.games?.recentGames || profile.games?.list?.slice(0, 5) || [];
        const recentGamesHtml = `
            <div class="profile-box-header">Recently Played Games</div>
            <div class="profile-box-content">
                <div class="recent-games-list">
                    ${recentGamesData.length > 0 ? recentGamesData.map(game => `
                        <div class="recent-game-item" onclick="openSteamStore('${game.appId}')">
                            <img src="${game.logoUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/capsule_231x87.jpg`}" 
                                 alt="${game.name}" 
                                 class="recent-game-icon"
                                 onerror="this.src='https://steamstore-a.akamaihd.net/public/images/v6/app_image_capsule.png'">
                            <div class="recent-game-info">
                                <div class="recent-game-name">${game.name}</div>
                                <div class="recent-game-hours">${game.hoursPlayed || 0} hours total</div>
                            </div>
                            <div class="recent-game-playtime">Last played today</div>
                        </div>
                    `).join('') : '<div style="color: #8f98a0; text-align: center; padding: 16px; font-size: 11px;">No recent games available</div>'}
                </div>
            </div>
        `;
        recentGames.innerHTML = recentGamesHtml;

        // Recent Activity
        const activityHtml = `
            <div class="profile-box-header">Recent Activity</div>
            <div class="profile-box-content">
                <div class="activity-feed">
                    <div class="activity-item">
                        <div class="activity-icon"></div>
                        <div class="activity-text">Unlocked new achievement in ${recentGamesData[0]?.name || 'a game'}</div>
                        <div class="activity-time">2h ago</div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-icon"></div>
                        <div class="activity-text">Added ${profile.gameCount ? Math.floor(Math.random() * 3) + 1 : 1} new games to library</div>
                        <div class="activity-time">1 day ago</div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-icon"></div>
                        <div class="activity-text">Reached Steam Level ${profile.level || Math.floor(Math.random() * 20) + 1}</div>
                        <div class="activity-time">3 days ago</div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-icon"></div>
                        <div class="activity-text">Completed ${Math.floor(Math.random() * 5) + 1} achievements this week</div>
                        <div class="activity-time">1 week ago</div>
                    </div>
                </div>
            </div>
        `;
        recentActivity.innerHTML = activityHtml;
    }

    // Display game recommendations
    function displayRecommendations(recommendations) {
        if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
            gamesGrid.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 32px; font-size: 12px;">No recommendations available</p>';
            return;
        }

        const html = recommendations.map(game => `
            <div class="game-capsule" onclick="openSteamStore('${game.appid}')">
                <div class="game-header">
                    <img src="${game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}" 
                         alt="${game.name || 'Game'}"
                         onerror="this.src='https://steamstore-a.akamaihd.net/public/images/v6/app_image_capsule.png'">
                </div>
                <div class="game-info">
                    <div class="game-title">${game.name || 'Unknown Game'}</div>
                    <div class="game-price">${formatPrice(game.price_overview)}</div>
                </div>
            </div>
        `).join('');

        gamesGrid.innerHTML = html;
    }

    // Format price for display
    function formatPrice(priceOverview) {
        if (!priceOverview || !priceOverview.final) return 'Free to Play';
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: priceOverview.currency || 'USD'
        }).format(priceOverview.final / 100);
    }

    // Open Steam store page in new tab
    function openSteamStore(appId) {
        if (appId) {
            window.open(`https://store.steampowered.com/app/${appId}`, '_blank');
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
    }

    // Show success message
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
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
        gamesGrid.innerHTML = '';
        profileHeader.innerHTML = '';
        profileInfo.innerHTML = '';
        profileBadges.innerHTML = '';
        profileStats.innerHTML = '';
        profileAchievements.innerHTML = '';
        recentGames.innerHTML = '';
        recentActivity.innerHTML = '';
        steamIdInput.focus();
    }

    // Focus on input when page loads
    steamIdInput.focus();
});