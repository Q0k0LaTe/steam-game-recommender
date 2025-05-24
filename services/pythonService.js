const { spawn } = require('child_process');
const path = require('path');

class PythonService {
    constructor() {
        this.pythonScript = path.join(__dirname, '..', 'niu_bi_de.py');
    }

    async executeNiuBiDe(steamId) {
        return new Promise((resolve, reject) => {
            // Pass the steamId as an argument to the Python script
            const python = spawn('python3', [this.pythonScript, steamId.toString()]);
            let dataString = '';
            let errorString = '';

            // Collect data from script
            python.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            // Collect error messages
            python.stderr.on('data', (data) => {
                errorString += data.toString();
            });

            // Handle process completion
            python.on('close', (code) => {
                if (code !== 0) {
                    console.error('Python script error:', errorString);
                    reject(new Error(`Python script failed with code ${code}: ${errorString}`));
                    return;
                }

                try {
                    // Parse the output array from Python script
                    const gameIds = JSON.parse(dataString.trim());
                    resolve(gameIds);
                } catch (error) {
                    console.error('Failed to parse Python output:', error);
                    reject(error);
                }
            });

            // Handle process errors
            python.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                reject(error);
            });
        });
    }
}

module.exports = new PythonService(); 