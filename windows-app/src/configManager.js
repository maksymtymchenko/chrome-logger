const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
    constructor() {
        this.configPath = path.join(os.homedir(), '.windows-activity-tracker', 'config.json');
        this.defaultConfig = {
            username: 'Unknown',
            serverUrl: 'http://localhost:8080',
            trackingInterval: 5000, // 5 seconds
            trackClipboard: true,
            trackApplications: true,
            trackWindows: true,
            trackScreenshots: true,
            screenshotOnWindowChange: true, // Take screenshots when window changes
            screenshotOnClick: true, // Take screenshots on clicks (when implemented)
            minActivityDuration: 1000, // 1 second minimum
            maxIdleTime: 300000, // 5 minutes
            workApplications: [
                'chrome.exe',
                'firefox.exe',
                'edge.exe',
                'code.exe',
                'notepad.exe',
                'word.exe',
                'excel.exe',
                'powerpoint.exe'
            ],
            personalApplications: [
                'steam.exe',
                'discord.exe',
                'spotify.exe',
                'vlc.exe',
                'games'
            ]
        };
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            console.log('Loading config from:', this.configPath);
            // Ensure directory exists
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const loadedConfig = JSON.parse(data);
                console.log('Loaded config from file:', loadedConfig);
                // Merge with defaults to ensure all properties exist
                const mergedConfig = {...this.defaultConfig, ...loadedConfig };
                console.log('Merged config:', mergedConfig);
                return mergedConfig;
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }

        console.log('Using default config');
        // Return default config and save it
        this.saveConfig(this.defaultConfig);
        return this.defaultConfig;
    }

    saveConfig(config) {
        try {
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            this.config = config;
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        const updatedConfig = {...this.config, ...newConfig };
        return this.saveConfig(updatedConfig);
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
        return this.saveConfig(this.config);
    }
}

module.exports = { ConfigManager };