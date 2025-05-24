import json
import ast
import sys

import numpy as np
import requests
from bs4 import BeautifulSoup

# Get Steam ID from command line argument or use default
User_ID = int(sys.argv[1]) if len(sys.argv) > 1 else 76561198867276542

num_cluster = 78
game_id_list = [
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
]

def raw_text_processing(s: str):
    achievements = []

    # Find the start of achievements section
    start_marker = "Personal Achievements\n"
    start_idx = s.find(start_marker)

    if start_idx == -1:
        return None

    # Extract the achievements section
    achievements_text = s[start_idx + len(start_marker):]

    # Split into lines and process
    lines = achievements_text.split('\n')
    i = 1

    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines
        if not line:
            i += 1
            continue
        if "An error was encountered while processing your request" in line:
            return None

        if i != len(lines) - 1 and ("hidden achievements remaining" in lines[i + 1].strip()):
            return achievements

        if "Valve Corporation. All rights reserved." in line:
            return achievements

        if i + 1 < len(lines):
            potential_name = line
            potential_description = lines[i + 1].strip()

            # Check if next line after description starts with "Unlocked" (unlocked achievement)
            if i + 2 < len(lines) and lines[i + 2].strip().startswith("Unlocked"):
                achievements.append({
                    'name': potential_name,
                    'unlocked': True
                })
                i += 3  # Skip name, description, and unlock time
            # Check if there's a progress indicator (locked achievement with progress)
            elif i + 2 < len(lines) and '/' in lines[i + 2].strip():
                progress_line = lines[i + 2].strip()
                # Verify it's a progress indicator (number/number format)
                if progress_line.count('/') == 1:
                    parts = progress_line.split('/')
                    if len(parts) == 2 and parts[0].strip().isdigit() and parts[1].strip().isdigit():
                        achievements.append({
                            'name': potential_name,
                            'unlocked': False
                        })
                        i += 3  # Skip name, description, and progress
                    else:
                        i += 1
                else:
                    i += 1
            # Otherwise, it's a locked achievement without progress
            else:
                # Verify this looks like a real achievement by checking if description is reasonable
                if (len(potential_description) > 10 and
                        not any(skip in potential_description.lower() for skip in
                                ['copyright', 'valve', 'steam', 'privacy', 'legal'])):
                    achievements.append({
                        'name': potential_name,
                        'unlocked': False
                    })
                i += 2  # Skip name and description
        else:
            i += 1
    return achievements

def get_steam_achievements_text(player_id: int, game_id: int):
    """Fetch and process Steam achievements for a specific player and game."""
    url = f"https://steamcommunity.com/profiles/{player_id}/stats/{game_id}/achievements"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, allow_redirects=True, timeout=30)

        # Check for redirect (might indicate private profile or invalid game)
        if response.history and ("achievements" not in response.url):
            return None

        # Check for successful response
        if response.status_code != 200:
            return None

        # Check if profile is private or game not owned
        if "profile is private" in response.text.lower():
            return None

        if "this user has not yet set up their game stats" in response.text.lower():
            return None

        soup = BeautifulSoup(response.text, 'html.parser')
        return soup.get_text(separator='\n', strip=True)

    except requests.exceptions.RequestException as e:
        return None
    except Exception as e:
        return None

def kai_hu(player_id: int):
    """Process all games for a specific player."""
    result = []

    for i, game_id in enumerate(game_id_list):

        achievements = get_steam_achievements_text(player_id, game_id)
        result.append([game_id, achievements])
    return result

def user_vector_generator(hu):
    achievements_cluster_map_file_path = "achievement_cluster_map.json"
    new_game_vector_file_path = "new_game_vector.json"
    with open(achievements_cluster_map_file_path, 'r', encoding='utf-8') as f:
        map_data = json.load(f)
    with open(new_game_vector_file_path, 'r', encoding='utf-8') as f:
        new_game_data = json.load(f)
    total_vector = np.zeros(num_cluster)
    for game_id, temp in hu:
        ach_list = ast.literal_eval(str(temp))
        for entry in ach_list:
            achievement = entry['name']
            ifDone = entry['unlocked']
            if achievement in map_data:
                x = map_data[achievement]
            else: continue
            if ifDone:
                total_vector[x] += 1
            else: total_vector[x] -= 0.2
    np_vector = np.array(total_vector)
    np_vector = np_vector / np.linalg.norm(np_vector)
    new_game_ranking = []
    for entry in new_game_data:
        new_game_vector = np.array(entry['vector'])
        score = new_game_vector.dot(np_vector)
        new_game_ranking.append([entry['new_game_id'], score])
    new_game_ranking = sorted(new_game_ranking, key=lambda x: x[1], reverse=True)
    result = []
    for i in range(8):
        result.append(new_game_ranking[i][0])
    return result

def local_kai_hu(data):
    hu = []
    for game_id, content in data:
        temp = raw_text_processing(content)
        if temp is not None:
            hu.append([game_id, temp])
    return user_vector_generator(hu)

def niu_bi_de_han_shu(player_id):
    return local_kai_hu(kai_hu(player_id))

if __name__ == "__main__":
    try:
        result = niu_bi_de_han_shu(User_ID)
        # Print result as JSON
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
