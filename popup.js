// YouTube Shorts Auto Scroll v2.1.0 - Popup Controller
// Developer: Emre Göçmen <info@emregocmen.com>
// Professional popup interface controller

class PopupController {
    constructor() {
        this.enableToggle = document.getElementById('enableToggle');
        this.delayInput = document.getElementById('delayInput');
        this.statusElement = document.getElementById('status');
        this.statusText = document.getElementById('statusText');
        this.debugMode = false; // Production: false
        
        this.init();
    }

    log(message, level = 'info') {
        if (this.debugMode || level === 'error' || level === 'warn') {
            const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
            console.log(`${prefix} YouTube Auto Scroll Popup: ${message}`);
        }
    }

    async init() {
        try {
            this.enableToggle.addEventListener('change', () => this.handleToggle());
            this.delayInput.addEventListener('change', () => this.handleDelayChange());
            this.delayInput.addEventListener('input', () => this.validateDelayInput());

            await this.loadCurrentStatus();
        } catch (error) {
            this.log(`Initialization error: ${error.message}`, 'error');
            this.showError('Initialization failed');
        }
    }

    async loadCurrentStatus() {
        try {
            const activeTab = await this.getActiveTab();
            
            if (!activeTab) {
                this.showError('No active tab found');
                return;
            }

            if (!this.isYouTubeUrl(activeTab.url)) {
                this.showNotOnYouTube();
                return;
            }

            await this.communicateWithContentScript(activeTab.id);
            
        } catch (error) {
            this.log(`Status loading error: ${error.message}`, 'error');
            this.showError('Connection failed');
        }
    }

    async getActiveTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0];
    }

    isYouTubeUrl(url) {
        return url && (url.includes('youtube.com') || url.includes('youtu.be'));
    }

    async communicateWithContentScript(tabId) {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                const response = await chrome.tabs.sendMessage(tabId, { action: 'getStatus' });
                
                if (response && response.success) {
                    this.updateUI(response);
                    this.showSuccess(response);
                    return;
                } else {
                    throw new Error('Content script not responding');
                }
                
            } catch (error) {
                if (retryCount === 0) {
                    await this.injectContentScript(tabId);
                    await this.delay(1500);
                } else if (retryCount === 1) {
                    await this.delay(1000);
                } else {
                    this.showScriptNotFound();
                    return;
                }
                
                retryCount++;
            }
        }
    }

    async injectContentScript(tabId) {
        try {
            this.showLoading('Loading extension...');
            
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
        } catch (error) {
            this.log(`Content script injection error: ${error.message}`, 'error');
            this.showError('Script loading failed');
        }
    }

    updateUI(response) {
        this.enableToggle.checked = response.enabled;
        this.delayInput.value = response.delay / 1000;
        this.enableControls();
    }

    showSuccess(response) {
        const isOnShorts = response.onShortsPage;
        
        if (isOnShorts) {
            this.setStatus('enabled', `✅ Active${response.enabled ? '' : ' (Disabled)'}`);
        } else {
            this.setStatus('disabled', '📱 Go to Shorts page');
        }
    }

    async handleToggle() {
        const enabled = this.enableToggle.checked;
        
        try {
            const activeTab = await this.getActiveTab();
            
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'toggle',
                enabled: enabled
            });

            if (response && response.success) {
                this.setStatus(enabled ? 'enabled' : 'disabled', 
                             enabled ? '✅ Enabled' : '❌ Disabled');
                
                this.showTemporaryMessage(enabled ? 'Enabled!' : 'Disabled!');
            } else {
                throw new Error('Toggle operation failed');
            }
            
        } catch (error) {
            this.log(`Toggle error: ${error.message}`, 'error');
            this.enableToggle.checked = !enabled;
            this.showError('Operation failed');
        }
    }

    async handleDelayChange() {
        const delay = parseFloat(this.delayInput.value) * 1000;
        
        try {
            const activeTab = await this.getActiveTab();
            
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'setDelay',
                delay: delay
            });

            if (response && response.success) {
                this.showTemporaryMessage(`Delay: ${this.delayInput.value}s`);
            } else {
                throw new Error('Delay setting failed');
            }
            
        } catch (error) {
            this.log(`Delay setting error: ${error.message}`, 'error');
            this.showError('Setting not saved');
        }
    }

    validateDelayInput() {
        const value = parseFloat(this.delayInput.value);
        
        if (value < 0.5) {
            this.delayInput.value = 0.5;
        } else if (value > 10) {
            this.delayInput.value = 10;
        }
    }

    setStatus(type, message) {
        this.statusElement.className = `status ${type}`;
        this.statusText.textContent = message;
    }

    showLoading(message) {
        this.setStatus('disabled', `🔄 ${message}`);
        this.disableControls();
    }

    showNotOnYouTube() {
        this.setStatus('disabled', '⚠️ Not on YouTube page');
        this.disableControls();
        this.addGoToYouTubeButton();
    }

    showScriptNotFound() {
        this.setStatus('disabled', '❌ Please refresh page (F5)');
        this.disableControls();
    }

    showError(message) {
        this.setStatus('disabled', `❌ ${message}`);
    }

    showTemporaryMessage(message) {
        const originalText = this.statusText.textContent;
        const originalClass = this.statusElement.className;
        
        this.setStatus('enabled', `✅ ${message}`);
        
        setTimeout(() => {
            this.statusText.textContent = originalText;
            this.statusElement.className = originalClass;
        }, 2000);
    }

    enableControls() {
        this.enableToggle.disabled = false;
        this.delayInput.disabled = false;
    }

    disableControls() {
        this.enableToggle.disabled = true;
        this.delayInput.disabled = true;
    }

    addGoToYouTubeButton() {
        if (!document.getElementById('goToYouTube')) {
            const button = document.createElement('div');
            button.id = 'goToYouTube';
            button.innerHTML = '<a href="https://youtube.com/shorts" target="_blank" style="color: white; text-decoration: underline; font-size: 12px;">Go to YouTube Shorts</a>';
            button.style.textAlign = 'center';
            button.style.marginTop = '10px';
            
            this.statusElement.appendChild(button);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});