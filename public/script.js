document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchForm = document.getElementById('searchForm');
    const steamIdInput = document.getElementById('steamId');
    const loadingSection = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const gamesGrid = document.getElementById('gamesGrid');
    const userProfileSection = document.getElementById('userProfile');
    const errorMessageEl = document.getElementById('errorMessage');
    const successMessageEl = document.getElementById('successMessage');
    const dynamicContent = document.querySelector('.dynamic-content');

    // Event Listeners
    searchForm.addEventListener('submit', handleFormSubmit);
    steamIdInput.addEventListener('keypress', handleEnterKey);

    /**
     * Handle form submission
     * @param {Event} e - Form submit event
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        const steamId = steamIdInput.value.trim();
        
        if (!steamId) {
            showError('Please enter a valid Steam ID');
            return;
        }

        // Show dynamic content
        dynamicContent.style.display = 'block';
        
        setLoadingState(true);
        clearResults();

        try {
            // Fetch user profile and recommendations
            const [profileData, recommendationsData] = await Promise.all([
                fetchUserProfile(steamId),
                fetchRecommendations(steamId)
            ]);

            // Display the results
            displayUserProfile(profileData);
            displayRecommendations(recommendationsData.recommendations);
            
            // Show success message
            showSuccess(`Successfully loaded profile for ${profileData.personaname || 'Unknown Player'}`);
            
            // Show results section
            resultsSection.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    /**
     * Fetch user profile data
     * @param {string} steamId - Steam ID to fetch profile for
     * @returns {Promise<Object>} - Profile data
     */
    async function fetchUserProfile(steamId) {
        const response = await fetch(`/api/profile/${encodeURIComponent(steamId)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch profile');
        }
        
        return data;
    }

    /**
     * Fetch game recommendations
     * @param {string} steamId - Steam ID to fetch recommendations for
     * @returns {Promise<Object>} - Recommendations data
     */
    async function fetchRecommendations(steamId) {
        const response = await fetch(`/api/recommendations/${encodeURIComponent(steamId)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch recommendations');
        }
        
        return data;
    }

    /**
     * Display user profile information
     * @param {Object} profile - User profile data
     */
    function displayUserProfile(profile) {
        const html = `
            <div class="user-profile">
                <img src="${profile.avatarUrl || ''}" 
                     alt="User Avatar" 
                     class="user-avatar"
                     onerror="this.style.display='none'">
                <div class="user-info">
                    <h3>${profile.personaname || 'Unknown Player'}</h3>
                    <div class="user-stats">
                        <span class="stat-item">Games: ${profile.gameCount || 0}</span>
                        <span class="stat-item">Level: ${profile.level || 0}</span>
                        <span class="stat-item">Hours: ${profile.totalPlaytime || 0}</span>
                    </div>
                </div>
            </div>
        `;
        userProfileSection.innerHTML = html;
    }

    /**
     * Display game recommendations
     * @param {Array} recommendations - Array of game recommendations
     */
    function displayRecommendations(recommendations) {
        if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
            gamesGrid.innerHTML = '<p class="error-message">No recommendations available</p>';
            return;
        }

        const html = recommendations.map(game => `
            <div class="game-capsule" onclick="window.open('https://store.steampowered.com/app/${game.appid}', '_blank')">
                <div class="game-header">
                    <img src="${game.header_image || ''}" 
                         alt="${game.name || 'Game image'}" 
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

    /**
     * Format price for display
     * @param {Object} priceOverview - Price data object
     * @returns {string} - Formatted price string
     */
    function formatPrice(priceOverview) {
        if (!priceOverview) return 'Free to Play';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: priceOverview.currency || 'USD'
        }).format(priceOverview.final / 100);
    }

    /**
     * Set loading state
     * @param {boolean} isLoading - Whether the app is in loading state
     */
    function setLoadingState(isLoading) {
        loadingSection.style.display = isLoading ? 'block' : 'none';
        steamIdInput.disabled = isLoading;
        searchForm.querySelector('button[type="submit"]').disabled = isLoading;
    }

    /**
     * Clear all results and hide dynamic content
     */
    function clearResults() {
        dynamicContent.style.display = 'none';
        resultsSection.style.display = 'none';
        gamesGrid.innerHTML = '';
        userProfileSection.innerHTML = '';
        steamIdInput.value = '';
        hideError();
        hideSuccess();
        steamIdInput.focus();
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        errorMessageEl.textContent = message;
        errorMessageEl.style.display = 'block';
        hideSuccess();
    }

    /**
     * Hide error message
     */
    function hideError() {
        errorMessageEl.style.display = 'none';
    }

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    function showSuccess(message) {
        successMessageEl.textContent = message;
        successMessageEl.style.display = 'block';
        hideError();
    }

    /**
     * Hide success message
     */
    function hideSuccess() {
        successMessageEl.style.display = 'none';
    }

    /**
     * Handle enter key press
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleEnterKey(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFormSubmit(e);
        }
    }
});