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
    const loadingText = document.querySelector('.loading-text');

    // Enhanced loading animation states for vector algorithm
    const loadingStates = [
        "Connecting to Steam profile...",
        "Scanning your game library...",
        "Processing achievement data from 67 games...",
        "Running AI vector analysis...",
        "Calculating preference matrix...",
        "Matching against 2000+ games database...",
        "Generating personalized recommendations...",
        "Finalizing your perfect game list..."
    ];

    let loadingStateIndex = 0;
    let loadingInterval;

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
        startLoadingAnimation();

        try {
            console.log(`Starting recommendation process for Steam ID: ${steamId}`);
            
            // Fetch profile and recommendations concurrently
            const [profileData, recommendationsData] = await Promise.all([
                fetchUserProfile(steamId),
                fetchRecommendations(steamId)
            ]);

            // Stop loading animation
            stopLoadingAnimation();

            // Display results
            displayUserProfile(profileData);
            displayRecommendations(recommendationsData.recommendations, recommendationsData.metadata);
            
            const profileName = profileData.personaname || profileData.personaName || 'User';
            const recCount = recommendationsData.recommendations?.length || 0;
            const isVectorBased = recommendationsData.metadata?.vectorAlgorithm === true;
            
            // Show success message based on recommendation type
            if (isVectorBased) {
                showSuccess(`🤖 Generated ${recCount} AI-powered recommendations for ${profileName} using advanced vector analysis!`);
            } else {
                showSuccess(`✨ Found ${recCount} personalized recommendations for ${profileName}!`);
            }
            
            showResults();
            
        } catch (error) {
            console.error('Error fetching Steam data:', error);
            stopLoadingAnimation();
            const errorMsg = error.message || 'Failed to fetch Steam data. Please check your Steam ID and ensure your profile is public.';
            showError(errorMsg);
            hideLoading();
        }
    }

    // Start enhanced loading animation for vector processing
    function startLoadingAnimation() {
        loadingStateIndex = 0;
        updateLoadingText();
        
        // Slower progression for vector algorithm steps
        loadingInterval = setInterval(() => {
            loadingStateIndex = (loadingStateIndex + 1) % loadingStates.length;
            updateLoadingText();
        }, 3000); // 3 seconds per step to show the AI processing
    }

    // Stop loading animation
    function stopLoadingAnimation() {
        if (loadingInterval) {
            clearInterval(loadingInterval);
            loadingInterval = null;
        }
    }

    // Update loading text with smooth animation
    function updateLoadingText() {
        if (loadingText) {
            loadingText.style.opacity = '0.5';
            
            setTimeout(() => {
                loadingText.textContent = loadingStates[loadingStateIndex];
                loadingText.style.opacity = '1';
                
                // Add special styling for AI steps
                if (loadingStates[loadingStateIndex].includes('AI') || 
                    loadingStates[loadingStateIndex].includes('vector') ||
                    loadingStates[loadingStateIndex].includes('matrix')) {
                    loadingText.style.color = '#66c0f4';
                    loadingText.style.fontWeight = 'bold';
                } else {
                    loadingText.style.color = '#c6d4df';
                    loadingText.style.fontWeight = 'normal';
                }
            }, 300);
        }
    }

    // Fetch user profile from API
    async function fetchUserProfile(steamId) {
        try {
            console.log(`Fetching profile for Steam ID: ${steamId}`);
            
            const response = await fetch(`/api/profile/${encodeURIComponent(steamId)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: Failed to fetch profile`);
            }
            
            console.log('Profile data received:', data.personaname || data.personaName);
            return data;
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Network error: Unable to connect to server');
            }
            throw error;
        }
    }

    // Fetch recommendations from API (this will run the vector algorithm)
    async function fetchRecommendations(steamId) {
        try {
            console.log(`Fetching vector-based recommendations for Steam ID: ${steamId}`);
            
            const response = await fetch(`/api/recommendations/${encodeURIComponent(steamId)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: Failed to fetch recommendations`);
            }
            
            console.log(`Recommendations received: ${data.recommendations?.length || 0} games`);
            console.log('Recommendation type:', data.metadata?.recommendationType);
            
            return data;
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Network error: Unable to connect to server');
            }
            throw error;
        }
    }

    // Display user profile information
    function displayUserProfile(profile) {
        // Profile Header
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

        // Profile Stats
        const totalGames = profile.games?.total || profile.gameCount || 0;
        const totalHours = Math.round(profile.games?.totalHours || profile.totalPlaytime || 0);
        const steamLevel = profile.level || 0;
        
        let yearsOnSteam = profile.yearsOfService || profile.yearsOnSteam || 0;
        if (!yearsOnSteam && profile.joinYear) {
            yearsOnSteam = new Date().getFullYear() - profile.joinYear;
        }
        if (!yearsOnSteam && profile.memberSince) {
            const memberYear = parseInt(profile.memberSince.match(/\d{4}/)?.[0]);
            if (memberYear) {
                yearsOnSteam = new Date().getFullYear() - memberYear;
            }
        }
        if (!yearsOnSteam) yearsOnSteam = Math.max(1, Math.min(20, Math.floor(totalHours / 1000)));

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
                    <span class="stat-number">${yearsOnSteam}</span>
                    <span class="stat-label">Years on Steam</span>
                </div>
            </div>
        `;
        profileStats.innerHTML = statsHtml;

        // Recent Games
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

    // Display game recommendations with enhanced UI for vector-based results
    function displayRecommendations(recommendations, metadata) {
        if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
            gamesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #8f98a0; padding: 40px; font-size: 14px;">
                    <p>No personalized recommendations available at the moment.</p>
                    <p style="margin-top: 8px; font-size: 12px;">This could be due to a private profile or limited game data.</p>
                </div>
            `;
            return;
        }

        const isVectorBased = metadata?.vectorAlgorithm === true;
        console.log(`Displaying ${recommendations.length} recommendations (Vector-based: ${isVectorBased})`);

        const html = recommendations.map((game, index) => {
            const gameId = game.appid || game.appId || game.id || '';
            const gameName = game.name || game.title || 'Unknown Game';
            const gameImage = game.header_image || 
                            (gameId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/header.jpg` : '');
            
            const matchPercentage = game.matchPercentage || game.score || 0;
            const reason = game.reason || 'Recommended for you';
            const isAIPowered = reason.includes('🤖') || reason.includes('AI-powered');

            return `
                <div class="game-capsule ${isAIPowered ? 'ai-powered' : ''}" 
                     onclick="openSteamStore('${gameId}')" 
                     style="animation-delay: ${index * 0.1}s">
                    <div class="game-header">
                        <img src="${gameImage}" 
                             alt="${gameName}"
                             onerror="this.src='https://steamstore-a.akamaihd.net/public/images/v6/app_image_capsule.png'">
                        ${isAIPowered ? '<div class="ai-badge">🤖 AI</div>' : ''}
                        <div class="match-percentage">${matchPercentage}%</div>
                    </div>
                    <div class="game-info">
                        <div class="game-title">${gameName}</div>
                        <div class="game-price">${formatPrice(game.price_overview)}</div>
                        <div class="game-reason">${reason}</div>
                    </div>
                </div>
            `;
        }).join('');

        gamesGrid.innerHTML = html;
        
        // Add special header for vector-based recommendations
        if (isVectorBased) {
            const sectionHeader = document.querySelector('.section-header');
            if (sectionHeader) {
                sectionHeader.innerHTML = '🤖 AI-Powered Recommendations Based on Your Gaming DNA';
                sectionHeader.style.background = 'linear-gradient(90deg, rgba(102, 192, 244, 0.8) 0%, rgba(255, 107, 53, 0.8) 100%)';
            }
        }
        
        // Trigger animation
        setTimeout(() => {
            document.querySelectorAll('.game-capsule').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('animate-in');
                }, index * 100);
            });
        }, 100);
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

    // Show loading state with enhanced animation
    function showLoading() {
        welcomeSection.style.display = 'none';
        loadingSection.style.display = 'block';
        resultsSection.style.display = 'none';
        
        // Enhanced spinner animation for AI processing
        const spinner = document.querySelector('.steam-spinner');
        if (spinner) {
            spinner.style.animation = 'spin 1s linear infinite, pulse 2s ease-in-out infinite alternate';
        }
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
        stopLoadingAnimation();
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
        
        // Auto-hide success after 6 seconds (longer for vector messages)
        setTimeout(() => {
            hideMessages();
        }, 6000);
    }

    // Hide all messages
    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    // Reset app to initial state
    window.resetApp = function() {
        welcomeSection.style.display = 'block';
        loadingSection.style.display = 'none';
        resultsSection.style.display = 'none';
        steamIdInput.value = '';
        hideMessages();
        stopLoadingAnimation();
        
        // Reset section header
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.innerHTML = 'Recommended For You';
            sectionHeader.style.background = 'linear-gradient(90deg, rgba(42, 71, 94, 0.7) 0%, rgba(23, 26, 33, 0.7) 100%)';
        }
        
        // Clear all profile sections
        gamesGrid.innerHTML = '';
        profileHeader.innerHTML = '';
        profileStats.innerHTML = '';
        recentGames.innerHTML = '';
        
        // Focus back on input
        steamIdInput.focus();
    }

    // Test vector algorithm function (for debugging)
    window.testVectorAlgorithm = async function(steamId) {
        try {
            console.log(`Testing vector algorithm for Steam ID: ${steamId}`);
            
            const response = await fetch(`/api/test-vector/${steamId}`);
            const data = await response.json();
            
            console.log('Vector algorithm test results:', data);
            return data;
            
        } catch (error) {
            console.error('Vector algorithm test failed:', error);
            return null;
        }
    }

    // Focus on input when page loads
    steamIdInput.focus();

    // Add Enter key support
    steamIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchForm.dispatchEvent(new Event('submit'));
        }
    });

    // Console welcome message
    console.log('🤖 SteamForge Vector AI Recommendation System Loaded');
    console.log('💡 Test the vector algorithm directly: testVectorAlgorithm("STEAM_ID")');
});