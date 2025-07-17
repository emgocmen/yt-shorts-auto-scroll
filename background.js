// YouTube Shorts Auto Scroll v2.1.0 - Background Script
// Developer: Emre Göçmen <info@emregocmen.com>
// Professional background service worker

class BackgroundManager {
    constructor() {
        this.debugMode = false; // Production: false
        this.init();
    }

    log(message, level = 'info') {
        if (this.debugMode || level === 'error' || level === 'warn') {
            const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
            console.log(`${prefix} YouTube Auto Scroll BG: ${message}`);
        }
    }

    init() {
        try {
            chrome.runtime.onInstalled.addListener((details) => {
                this.handleInstall(details);
            });

            chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                this.handleTabUpdate(tabId, changeInfo, tab);
            });

            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
            });
        } catch (error) {
            this.log(`Initialization error: ${error.message}`, 'error');
        }
    }

    async handleInstall(details) {
        try {
            if (details.reason === 'install') {
                await this.setDefaultSettings();
                this.showWelcomeNotification();
            } else if (details.reason === 'update') {
                await this.migrateSettings();
            }
        } catch (error) {
            this.log(`Install handling error: ${error.message}`, 'error');
        }
    }

    async setDefaultSettings() {
        try {
            await chrome.storage.sync.set({
                autoScrollEnabled: true,
                scrollDelay: 1500
            });
        } catch (error) {
            this.log(`Default settings error: ${error.message}`, 'error');
        }
    }

    async migrateSettings() {
        try {
            const settings = await chrome.storage.sync.get();
            let updated = false;

            if (!settings.hasOwnProperty('autoScrollEnabled')) {
                settings.autoScrollEnabled = true;
                updated = true;
            }
            if (!settings.hasOwnProperty('scrollDelay')) {
                settings.scrollDelay = 1500;
                updated = true;
            }

            if (updated) {
                await chrome.storage.sync.set(settings);
            }
        } catch (error) {
            this.log(`Settings migration error: ${error.message}`, 'error');
        }
    }

    showWelcomeNotification() {
        if (chrome.notifications) {
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon48.png',
                    title: 'YouTube Shorts Auto Scroll',
                    message: 'Extension installed successfully! Auto-scroll is now active on YouTube Shorts.'
                });
            } catch (error) {
                this.log(`Notification error: ${error.message}`, 'warn');
            }
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && 
            tab.url && 
            this.isYouTubeUrl(tab.url)) {
            
            this.checkContentScript(tabId);
        }
    }

    isYouTubeUrl(url) {
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    async checkContentScript(tabId) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            
            if (!response || !response.success) {
                this.tryInjectContentScript(tabId);
            }
        } catch (error) {
            this.tryInjectContentScript(tabId);
        }
    }

    async tryInjectContentScript(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            
            if (tab.url && this.isYouTubeUrl(tab.url)) {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
            }
        } catch (error) {
            this.log(`Content script injection failed: ${error.message}`, 'warn');
        }
    }

    handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'contentReady':
                    sendResponse({ status: 'acknowledged' });
                    break;

                case 'getVersion':
                    sendResponse({ 
                        version: chrome.runtime.getManifest().version,
                        success: true 
                    });
                    break;

                case 'reportError':
                    this.log(`Content script error: ${message.error}`, 'error');
                    sendResponse({ status: 'logged' });
                    break;

                default:
                    sendResponse({ status: 'unknown' });
                    break;
            }
        } catch (error) {
            this.log(`Message handling error: ${error.message}`, 'error');
            sendResponse({ success: false, error: error.message });
        }

        return true; // Enable async response
    }
}

// Initialize background manager
const backgroundManager = new BackgroundManager();