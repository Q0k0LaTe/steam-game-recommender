document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchForm = document.getElementById('searchForm');
    const steamIdInput = document.getElementById('steamId');
    const welcomeSection = document.getElementById('welcomeSection');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    const gamesGrid = document.getElementById('gamesGrid');
    const userProfile = document.getElementById('userProfile');
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

    // Display user profile information
    function displayUserProfile(profile) {
        const html = `
            <div class="user-profile">
                <img src="${profile.avatarUrl || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg'}" 
                     alt="User Avatar" 
                     class="user-avatar"
                     onerror="this.src='https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg'">
                <div class="user-info">
                    <h3>${profile.personaname || 'Steam User'}</h3>
                    <div class="user-stats">
                        <span class="stat-item">Games: ${profile.gameCount || 0}</span>
                        <span class="stat-item">Level: ${profile.level || 0}</span>
                        <span class="stat-item">Hours: ${Math.round(profile.totalPlaytime || 0)}</span>
                        ${profile.location ? `<span class="stat-item">${profile.location}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        userProfile.innerHTML = html;
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
        userProfile.innerHTML = '';
        steamIdInput.focus();
    }

    // Focus on input when page loads
    steamIdInput.focus();
});