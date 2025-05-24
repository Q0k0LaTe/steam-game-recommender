document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const steamIdInput = document.getElementById('steamId');
    const loadingSection = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const gamesGrid = document.getElementById('gamesGrid');
    const userProfileSection = document.getElementById('userProfile');

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const steamId = steamIdInput.value.trim();
        
        if (!steamId) {
            alert('Please enter a valid Steam ID');
            return;
        }

        // Show loading state
        loadingSection.style.display = 'block';
        resultsSection.style.display = 'none';
        gamesGrid.innerHTML = '';
        userProfileSection.innerHTML = '';

        try {
            // Get user profile
            const profileResponse = await fetch(`/api/profile/${steamId}`);
            const profileData = await profileResponse.json();

            if (profileData.error) {
                throw new Error(profileData.error);
            }

            // Display user profile
            displayUserProfile(profileData);

            // Get recommendations
            const recommendationsResponse = await fetch(`/api/recommendations/${steamId}`);
            const recommendationsData = await recommendationsResponse.json();

            console.log('Raw recommendations data:', recommendationsData);

            if (recommendationsData.error) {
                throw new Error(recommendationsData.error);
            }

            // Try to find recommendations array in the response
            let recommendationsArray;
            if (Array.isArray(recommendationsData)) {
                recommendationsArray = recommendationsData;
            } else if (recommendationsData.recommendations && Array.isArray(recommendationsData.recommendations)) {
                recommendationsArray = recommendationsData.recommendations;
            } else if (recommendationsData.games && Array.isArray(recommendationsData.games)) {
                recommendationsArray = recommendationsData.games;
            } else {
                console.error('Could not find recommendations array in:', recommendationsData);
                throw new Error('Invalid recommendations data format');
            }

            console.log('Processed recommendations array:', recommendationsArray);

            // Display recommendations
            displayRecommendations(recommendationsArray);

            // Show results
            loadingSection.style.display = 'none';
            resultsSection.style.display = 'block';

        } catch (error) {
            console.error('Error in recommendation process:', error);
            loadingSection.style.display = 'none';
            alert(error.message || 'An error occurred while fetching recommendations');
        }
    });

    function displayUserProfile(profile) {
        const html = `
            <div class="user-profile">
                <img src="${profile.avatarUrl}" alt="User Avatar" class="user-avatar">
                <div class="user-info">
                    <h3>${profile.personaname}</h3>
                    <div class="user-stats">
                        <span class="stat-item">Games: ${profile.gameCount}</span>
                        <span class="stat-item">Level: ${profile.level}</span>
                        <span class="stat-item">Hours: ${profile.totalPlaytime}</span>
                    </div>
                </div>
            </div>
        `;
        userProfileSection.innerHTML = html;
    }

    function displayRecommendations(recommendations) {
        console.log('Displaying recommendations:', recommendations);

        if (!recommendations) {
            console.error('Recommendations is null or undefined');
            gamesGrid.innerHTML = '<p class="error-message">No recommendations available</p>';
            return;
        }

        if (!Array.isArray(recommendations)) {
            console.error('Recommendations is not an array:', typeof recommendations, recommendations);
            gamesGrid.innerHTML = '<p class="error-message">No recommendations available</p>';
            return;
        }

        if (recommendations.length === 0) {
            gamesGrid.innerHTML = '<p class="error-message">No games found to recommend</p>';
            return;
        }

        const html = recommendations.map(game => {
            console.log('Processing game:', game);
            return `
                <div class="game-capsule" onclick="window.open('https://store.steampowered.com/app/${game.appid}', '_blank')">
                    <div class="game-header">
                        <img src="${game.header_image || ''}" alt="${game.name || 'Game image'}" 
                             onerror="this.src='https://steamstore-a.akamaihd.net/public/images/v6/app_image_capsule.png'">
                    </div>
                    <div class="game-info">
                        <div class="game-title">${game.name || 'Unknown Game'}</div>
                        <div class="game-price">${formatPrice(game.price_overview)}</div>
                    </div>
                </div>
            `;
        }).join('');

        gamesGrid.innerHTML = html;
    }

    function formatPrice(priceOverview) {
        if (!priceOverview) return 'Free to Play';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: priceOverview.currency || 'USD'
        }).format(priceOverview.final / 100);
    }
}); 