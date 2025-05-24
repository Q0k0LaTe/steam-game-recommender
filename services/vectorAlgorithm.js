const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// EXACT TRANSLATION FROM PYTHON - NO CHANGES
const NUM_CLUSTER = 78;
const GAME_ID_LIST = [
    105600, 107410, 211820, 222880, 227300,
    232090, 233450, 242760, 250900, 252950,
    255710, 268500, 271590, 275850, 289070, 292030, 304050, 304930,
    307780, 311210, 346110, 367520, 374320, 381210, 386360,
    397540, 413150, 418370, 431960, 444090, 460950, 489830,
    493340, 578080, 582160, 584400, 594650, 601150, 632360, 648800,
    700330, 739630, 782330, 813780, 960090, 1086940, 1174180, 1245620,
    1286830, 1332010, 1449850, 1599340, 1677740, 1971650,
    2050650, 209000, 2221490, 2231450, 2358720, 2379780, 812140,
    1318690, 1426210, 457140, 744190, 942970, 646570, 508440,
    911400
];

/**
 * def raw_text_processing(s: str):
 * EXACT PYTHON TRANSLATION
 */
function rawTextProcessing(s) {
    const achievements = [];

    // Find the start of achievements section
    const startMarker = "Personal Achievements\n";
    const startIdx = s.indexOf(startMarker);

    if (startIdx === -1) {
        return null;
    }

    // Extract the achievements section
    const achievementsText = s.substring(startIdx + startMarker.length);

    // Split into lines and process
    const lines = achievementsText.split('\n');
    let i = 1;

    while (i < lines.length) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) {
            i += 1;
            continue;
        }

        if (line.includes("An error was encountered while processing your request")) {
            return null;
        }

        if (i !== lines.length - 1 && lines[i + 1].trim().includes("hidden achievements remaining")) {
            return achievements;
        }

        if (line.includes("Valve Corporation. All rights reserved.")) {
            return achievements;
        }

        if (i + 1 < lines.length) {
            const potentialName = line;
            const potentialDescription = lines[i + 1].trim();

            // Check if next line after description starts with "Unlocked" (unlocked achievement)
            if (i + 2 < lines.length && lines[i + 2].trim().startsWith("Unlocked")) {
                achievements.push({
                    name: potentialName,
                    unlocked: true
                });
                i += 3; // Skip name, description, and unlock time
            }
            // Check if there's a progress indicator (locked achievement with progress)
            else if (i + 2 < lines.length && lines[i + 2].trim().includes('/')) {
                const progressLine = lines[i + 2].trim();
                // Verify it's a progress indicator (number/number format)
                if (progressLine.split('/').length - 1 === 1) { // count('/') == 1
                    const parts = progressLine.split('/');
                    if (parts.length === 2 && 
                        /^\d+$/.test(parts[0].trim()) && 
                        /^\d+$/.test(parts[1].trim())) {
                        achievements.push({
                            name: potentialName,
                            unlocked: false
                        });
                        i += 3; // Skip name, description, and progress
                    } else {
                        i += 1;
                    }
                } else {
                    i += 1;
                }
            }
            // Otherwise, it's a locked achievement without progress
            else {
                // Verify this looks like a real achievement by checking if description is reasonable
                const skipWords = ['copyright', 'valve', 'steam', 'privacy', 'legal'];
                if (potentialDescription.length > 10 &&
                    !skipWords.some(skip => potentialDescription.toLowerCase().includes(skip))) {
                    achievements.push({
                        name: potentialName,
                        unlocked: false
                    });
                }
                i += 2; // Skip name and description
            }
        } else {
            i += 1;
        }
    }
    return achievements;
}

/**
 * def get_steam_achievements_text(player_id: int, game_id: int):
 * EXACT PYTHON TRANSLATION
 */
async function getSteamAchievementsText(playerId, gameId) {
    const url = `https://steamcommunity.com/profiles/${playerId}/stats/${gameId}/achievements`;
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    };

    try {
        const response = await axios.get(url, {
            headers: headers,
            timeout: 30000,
            maxRedirects: 5
        });

        // Check for redirect (might indicate private profile or invalid game)
        if (response.request.res && response.request.res.responseUrl && 
            !response.request.res.responseUrl.includes("achievements")) {
            return null;
        }

        // Check for successful response
        if (response.status !== 200) {
            return null;
        }

        // Check if profile is private or game not owned
        if (response.data.toLowerCase().includes("profile is private")) {
            return null;
        }

        if (response.data.toLowerCase().includes("this user has not yet set up their game stats")) {
            return null;
        }

        const $ = cheerio.load(response.data);
        return $.text().replace(/\s+/g, '\n').trim();

    } catch (error) {
        return null;
    }
}

/**
 * def kai_hu(player_id: int):
 * EXACT PYTHON TRANSLATION
 */
async function kaiHu(playerId) {
    const result = [];
    
    for (let i = 0; i < GAME_ID_LIST.length; i++) {
        const gameId = GAME_ID_LIST[i];
        const achievementsText = await getSteamAchievementsText(playerId, gameId);
        result.push([gameId, achievementsText]);  // Just store raw text
    }
    
    return result;
}

/**
 * def user_vector_generator(hu):
 * EXACT PYTHON TRANSLATION
 */
function userVectorGenerator(hu) {
    const achievementsClusterMapFilePath = path.join(__dirname, '..', 'achievement_cluster_map.json');
    const newGameVectorFilePath = path.join(__dirname, '..', 'new_game_vector.json');
    
    const mapData = JSON.parse(fs.readFileSync(achievementsClusterMapFilePath, 'utf8'));
    const newGameData = JSON.parse(fs.readFileSync(newGameVectorFilePath, 'utf8'));
    
    const totalVector = new Array(NUM_CLUSTER).fill(0);
    
    for (const [gameId, temp] of hu) {
        if (!temp) continue;
        
        // ast.literal_eval(str(temp)) equivalent
        const achList = temp;
        
        for (const entry of achList) {
            const achievement = entry.name;
            const ifDone = entry.unlocked;
            
            if (achievement in mapData) {
                const x = mapData[achievement];
                if (ifDone) {
                    totalVector[x] += 1;
                } else {
                    totalVector[x] -= 0.2;
                }
            } else {
                continue;
            }
        }
    }
    
    // np_vector = np.array(total_vector)
    // np_vector = np_vector / np.linalg.norm(np_vector)
    const magnitude = Math.sqrt(totalVector.reduce((sum, val) => sum + val * val, 0));
    const npVector = magnitude > 0 ? totalVector.map(val => val / magnitude) : totalVector;
    
    const newGameRanking = [];
    
    for (const entry of newGameData) {
        const newGameVector = entry.vector;
        const score = dotProduct(newGameVector, npVector);
        newGameRanking.push([entry.new_game_id, score]);
    }
    
    // sorted(new_game_ranking, key=lambda x: x[1], reverse=True)
    newGameRanking.sort((a, b) => b[1] - a[1]);
    
    const result = [];
    for (let i = 0; i < 8; i++) {
        result.push(newGameRanking[i][0]);
    }
    
    return result;
}

/**
 * Helper function for dot product (numpy equivalent)
 */
function dotProduct(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        return 0;
    }
    
    let result = 0;
    for (let i = 0; i < vectorA.length; i++) {
        result += vectorA[i] * vectorB[i];
    }
    
    return result;
}

/**
 * def local_kai_hu(data):
 * EXACT PYTHON TRANSLATION
 */
function localKaiHu(data) {
    const hu = [];
    
    for (const [gameId, content] of data) {
        const temp = rawTextProcessing(content);  // Process raw text here
        if (temp !== null) {
            hu.push([gameId, temp]);
        }
    }
    
    return userVectorGenerator(hu);
}

/**
 * def niu_bi_de_han_shu(player_id):
 * EXACT PYTHON TRANSLATION - This is your main function
 */
async function niuBiDeHanShu(playerId) {
    const kaiHuResult = await kaiHu(playerId);
    return localKaiHu(kaiHuResult);
}

// Export the main function
module.exports = {
    niuBiDeHanShu,
    // Export other functions if needed for testing
    rawTextProcessing,
    getSteamAchievementsText,
    kaiHu,
    userVectorGenerator,
    localKaiHu
};