// YouTube Shorts Auto Scroll v2.1.0
// Developer: Emre Göçmen <info@emregocmen.com>
// Professional YouTube Shorts auto-navigation extension

class YouTubeShortsAutoScroll {
    constructor() {
        this.isEnabled = true;
        this.scrollDelay = 1500;
        this.isProcessing = false;
        this.currentVideoId = null;
        this.observerInitialized = false;
        this.lastUrl = '';
        this.lastVideoTime = 0;
        this.activeObserver = null;
        this.activeWatcher = null;
        this.debugMode = false; // Production: false
        
        this.init();
    }

    log(message, level = 'info') {
        if (this.debugMode || level === 'error' || level === 'warn') {
            const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
            console.log(`${prefix} YouTube Auto Scroll: ${message}`);
        }
    }

    async init() {
        try {
            await this.loadSettings();
            this.setupGlobalCommands();
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.startWhenReady());
            } else {
                this.startWhenReady();
            }
            
            this.setupMessageListener();
        } catch (error) {
            this.log(`Initialization error: ${error.message}`, 'error');
        }
    }

    startWhenReady() {
        try {
            this.startUrlMonitoring();
            
            if (this.isOnShortsPage()) {
                this.setupShortsObserver();
                this.reportReady();
            }
        } catch (error) {
            this.log(`Startup error: ${error.message}`, 'error');
        }
    }

    startUrlMonitoring() {
        setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== this.lastUrl) {
                this.lastUrl = currentUrl;
                
                if (this.isOnShortsPage()) {
                    this.cleanupAndRestart();
                }
            }
        }, 2000);

        this.setupYouTubeEvents();
    }

    setupYouTubeEvents() {
        window.addEventListener('yt-navigate-finish', () => {
            if (this.isOnShortsPage()) {
                setTimeout(() => this.cleanupAndRestart(), 1000);
            }
        });

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(() => window.dispatchEvent(new Event('urlchange')), 200);
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(() => window.dispatchEvent(new Event('urlchange')), 200);
        };

        window.addEventListener('urlchange', () => {
            if (this.isOnShortsPage()) {
                setTimeout(() => this.cleanupAndRestart(), 1000);
            }
        });
    }

    cleanupAndRestart() {
        try {
            if (this.activeObserver) {
                this.activeObserver.disconnect();
                this.activeObserver = null;
            }
            
            if (this.activeWatcher) {
                this.activeWatcher.cleanup();
                this.activeWatcher = null;
            }
            
            this.observerInitialized = false;
            this.isProcessing = false;
            this.currentVideoId = null;
            
            setTimeout(() => {
                this.setupShortsObserver();
            }, 1500);
        } catch (error) {
            this.log(`Cleanup error: ${error.message}`, 'error');
        }
    }

    isOnShortsPage() {
        return window.location.pathname.includes('/shorts/');
    }

    setupShortsObserver() {
        if (this.observerInitialized) {
            return;
        }
        
        this.observerInitialized = true;
        this.startVideoMonitoring();
    }

    startVideoMonitoring() {
        const checkForVideo = () => {
            if (!this.isEnabled || !this.isOnShortsPage()) return;
            
            try {
                const videos = document.querySelectorAll('video');
                let mainVideo = null;
                let maxSize = 0;
                
                videos.forEach(video => {
                    const size = video.offsetWidth * video.offsetHeight;
                    if (size > maxSize && size > 40000) {
                        maxSize = size;
                        mainVideo = video;
                    }
                });
                
                if (mainVideo) {
                    const newVideoId = this.getCurrentVideoId();
                    
                    if (newVideoId !== this.currentVideoId) {
                        this.currentVideoId = newVideoId;
                        
                        if (this.activeWatcher) {
                            this.activeWatcher.cleanup();
                        }
                        
                        this.setupVideoWatcher(mainVideo);
                    }
                }
            } catch (error) {
                this.log(`Video monitoring error: ${error.message}`, 'error');
            }
        };
        
        setTimeout(checkForVideo, 1000);
        
        const monitoringInterval = setInterval(checkForVideo, 2000);
        
        this.activeObserver = new MutationObserver(() => {
            setTimeout(checkForVideo, 500);
        });
        
        this.activeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            if (monitoringInterval) clearInterval(monitoringInterval);
        }, 300000);
    }

    getCurrentVideoId() {
        const match = window.location.pathname.match(/\/shorts\/([^/?]+)/);
        if (match) return match[1];
        
        const videoElement = document.querySelector('video');
        if (videoElement) {
            const container = videoElement.closest('[data-video-id]');
            if (container) return container.getAttribute('data-video-id');
        }
        
        return `video_${Date.now()}`;
    }

    setupVideoWatcher(video) {
        if (!video || this.isProcessing) return;
        
        try {
            let hasTriggered = false;
            let wasNearEnd = false;
            this.lastVideoTime = 0;
            
            const triggerScroll = (reason) => {
                if (hasTriggered || !this.isEnabled || this.isProcessing) return;
                hasTriggered = true;
                this.triggerScroll();
            };
            
            const setupListeners = () => {
                const handleTimeUpdate = () => {
                    if (!this.isEnabled || hasTriggered) return;
                    
                    const duration = video.duration;
                    const currentTime = video.currentTime;
                    
                    if (duration && currentTime) {
                        const progress = currentTime / duration;
                        
                        if (progress >= 0.95) {
                            wasNearEnd = true;
                        }
                        
                        if (wasNearEnd && currentTime < 2 && this.lastVideoTime > duration - 2) {
                            triggerScroll('loop-detected');
                        }
                        
                        this.lastVideoTime = currentTime;
                    }
                };
                
                const handleEnded = () => {
                    triggerScroll('ended-event');
                };
                
                const handlePause = () => {
                    if (video.currentTime > 0 && video.currentTime < video.duration) {
                        hasTriggered = false;
                    }
                };
                
                const handleError = () => {
                    this.log('Video playback error detected', 'warn');
                    hasTriggered = false;
                };
                
                video.addEventListener('ended', handleEnded);
                video.addEventListener('timeupdate', handleTimeUpdate);
                video.addEventListener('pause', handlePause);
                video.addEventListener('error', handleError);
                
                const cleanup = () => {
                    video.removeEventListener('ended', handleEnded);
                    video.removeEventListener('timeupdate', handleTimeUpdate);
                    video.removeEventListener('pause', handlePause);
                    video.removeEventListener('error', handleError);
                    if (backupPoll) clearInterval(backupPoll);
                };
                
                const backupPoll = setInterval(() => {
                    if (!this.isEnabled || hasTriggered) {
                        clearInterval(backupPoll);
                        return;
                    }
                    
                    if (video.ended || (video.duration && video.currentTime >= video.duration)) {
                        clearInterval(backupPoll);
                        triggerScroll('backup-poll');
                    }
                }, 3000);
                
                this.activeWatcher = {
                    video: video,
                    cleanup: cleanup
                };
                
                setTimeout(cleanup, 120000);
            };
            
            if (video.readyState >= 1) {
                setupListeners();
            } else {
                video.addEventListener('loadedmetadata', setupListeners, { once: true });
                setTimeout(setupListeners, 5000);
            }
        } catch (error) {
            this.log(`Video watcher setup error: ${error.message}`, 'error');
        }
    }

    async triggerScroll() {
        if (this.isProcessing) {
            return;
        }
        
        try {
            this.isProcessing = true;
            
            await this.delay(this.scrollDelay);
            
            if (!this.isEnabled) {
                this.isProcessing = false;
                return;
            }
            
            const currentUrl = window.location.href;
            
            const scrollMethods = [
                () => this.keyboardScroll(),
                () => this.modernWheelScroll(),
                () => this.safeDirectNavigation()
            ];
            
            for (let i = 0; i < scrollMethods.length; i++) {
                try {
                    scrollMethods[i]();
                } catch (error) {
                    this.log(`Scroll method ${i + 1} error: ${error.message}`, 'warn');
                }
                
                await this.delay(600);
                
                if (window.location.href !== currentUrl) {
                    this.isProcessing = false;
                    return;
                }
            }
            
            setTimeout(() => {
                this.isProcessing = false;
            }, 4000);
        } catch (error) {
            this.log(`Scroll trigger error: ${error.message}`, 'error');
            this.isProcessing = false;
        }
    }

    keyboardScroll() {
        const focusTarget = document.querySelector('ytd-shorts') || document.body;
        focusTarget.focus();
        
        const keyEvent = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true
        });
        
        [document, document.body, focusTarget].forEach(target => {
            target.dispatchEvent(keyEvent);
        });
        
        setTimeout(() => {
            const keyUpEvent = new KeyboardEvent('keyup', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                which: 40,
                bubbles: true,
                cancelable: true
            });
            
            [document, document.body, focusTarget].forEach(target => {
                target.dispatchEvent(keyUpEvent);
            });
        }, 100);
    }

    modernWheelScroll() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const wheelEvent = new WheelEvent('wheel', {
                    deltaY: window.innerHeight * 1.5,
                    deltaMode: WheelEvent.DOM_DELTA_PIXEL,
                    bubbles: true,
                    cancelable: true
                });
                
                const targets = [
                    document.querySelector('ytd-shorts'),
                    document.querySelector('#shorts-container'),
                    document.querySelector('[role="main"]'),
                    document.documentElement,
                    document.body
                ].filter(Boolean);
                
                targets.forEach(target => {
                    try {
                        target.dispatchEvent(wheelEvent);
                    } catch (error) {
                        // Silent fail
                    }
                });
                
            }, i * 100);
        }
    }

    safeDirectNavigation() {
        const buttonSelectors = [
            'button[aria-label*="next"]',
            'button[aria-label*="Next"]', 
            'button[aria-label*="ileri"]',
            'button[aria-label*="İleri"]',
            '[role="button"][aria-label*="next"]'
        ];
        
        let buttonFound = false;
        
        buttonSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(button => {
                if (button.offsetParent !== null && !buttonFound) {
                    button.click();
                    buttonFound = true;
                }
            });
        });
        
        if (!buttonFound) {
            const containers = [
                document.querySelector('ytd-shorts'),
                document.querySelector('#shorts-container'),
                document.documentElement
            ].filter(Boolean);
            
            containers.forEach(container => {
                const currentScroll = container.scrollTop;
                container.scrollTop = currentScroll + window.innerHeight;
                
                if (container.scrollTo) {
                    container.scrollTo({
                        top: currentScroll + window.innerHeight,
                        behavior: 'smooth'
                    });
                }
            });
        }
    }

    setupGlobalCommands() {
        const commands = {
            test: () => {
                if (this.isOnShortsPage()) {
                    this.triggerScroll();
                    console.log('✅ Manual scroll test initiated');
                } else {
                    console.log('❌ Not on YouTube Shorts page');
                }
            },
            
            toggle: () => {
                this.isEnabled = !this.isEnabled;
                this.saveSettings();
                console.log(`🔄 Auto scroll: ${this.isEnabled ? 'ENABLED' : 'DISABLED'}`);
                return this.isEnabled;
            },
            
            delay: (ms) => {
                if (ms !== undefined) {
                    this.scrollDelay = Math.max(500, Math.min(10000, ms));
                    this.saveSettings();
                    console.log(`⏰ Delay set to: ${this.scrollDelay}ms`);
                }
                return this.scrollDelay;
            },
            
            status: () => {
                const video = document.querySelector('video');
                const status = {
                    enabled: this.isEnabled,
                    delay: this.scrollDelay,
                    onShortsPage: this.isOnShortsPage(),
                    currentVideo: this.currentVideoId,
                    processing: this.isProcessing,
                    observerActive: !!this.activeObserver,
                    watcherActive: !!this.activeWatcher,
                    url: window.location.href,
                    videoInfo: video ? {
                        duration: video.duration,
                        currentTime: video.currentTime,
                        ended: video.ended,
                        paused: video.paused
                    } : null
                };
                console.table(status);
                return status;
            },
            
            restart: () => {
                this.cleanupAndRestart();
                console.log('🔄 Observer and watcher restarted');
            },
            
            debug: (enable) => {
                if (enable !== undefined) {
                    this.debugMode = !!enable;
                    console.log(`🐛 Debug mode: ${this.debugMode ? 'ENABLED' : 'DISABLED'}`);
                }
                return this.debugMode;
            },
            
            help: () => {
                console.log(`
🎯 YOUTUBE SHORTS AUTO SCROLL COMMANDS:

ytAutoScroll.test()      - Manual scroll test
ytAutoScroll.toggle()    - Enable/disable auto scroll
ytAutoScroll.delay(ms)   - Set delay (500-10000ms)
ytAutoScroll.status()    - Show detailed status
ytAutoScroll.restart()   - Restart observer/watcher
ytAutoScroll.debug(true) - Enable debug logging
ytAutoScroll.help()      - Show this help

Developer: Emre Göçmen <info@emregocmen.com>
Version: 2.1.0
                `);
            }
        };
        
        try {
            window.ytAutoScroll = commands;
            window.autoScrollCommands = commands;
            window.youtubeAutoScroll = commands;
            
            Object.defineProperty(window, 'yt_scroll', {
                value: commands,
                writable: false,
                configurable: true
            });
            
        } catch (error) {
            this.log(`Global commands setup error: ${error.message}`, 'error');
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                switch (message.action) {
                    case 'getStatus':
                        sendResponse({
                            success: true,
                            enabled: this.isEnabled,
                            delay: this.scrollDelay,
                            onShortsPage: this.isOnShortsPage(),
                            currentVideo: this.currentVideoId
                        });
                        break;
                        
                    case 'toggle':
                        this.isEnabled = message.enabled;
                        this.saveSettings();
                        sendResponse({ success: true, enabled: this.isEnabled });
                        break;
                        
                    case 'setDelay':
                        this.scrollDelay = Math.max(500, Math.min(10000, message.delay));
                        this.saveSettings();
                        sendResponse({ success: true, delay: this.scrollDelay });
                        break;
                        
                    case 'testScroll':
                        if (this.isOnShortsPage()) {
                            this.triggerScroll();
                            sendResponse({ success: true, message: 'Test scroll initiated' });
                        } else {
                            sendResponse({ success: false, message: 'Not on Shorts page' });
                        }
                        break;
                        
                    case 'ping':
                        sendResponse({ success: true, status: 'ready' });
                        break;
                        
                    default:
                        sendResponse({ success: false, message: 'Unknown command' });
                }
            } catch (error) {
                this.log(`Message handling error: ${error.message}`, 'error');
                sendResponse({ success: false, error: error.message });
            }
            
            return true;
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['autoScrollEnabled', 'scrollDelay']);
            this.isEnabled = result.autoScrollEnabled !== false;
            this.scrollDelay = result.scrollDelay || 1500;
        } catch (error) {
            this.log(`Settings load error: ${error.message}`, 'error');
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                autoScrollEnabled: this.isEnabled,
                scrollDelay: this.scrollDelay
            });
        } catch (error) {
            this.log(`Settings save error: ${error.message}`, 'error');
        }
    }

    reportReady() {
        try {
            chrome.runtime.sendMessage({
                action: 'contentReady',
                url: window.location.href,
                isOnShortsPage: this.isOnShortsPage()
            }).catch(() => {
                // Silent fail - background script might not be available
            });
        } catch (error) {
            // Silent fail
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize extension - single instance only
if (!window.youtubeShortsAutoScrollInstance) {
    window.youtubeShortsAutoScrollInstance = new YouTubeShortsAutoScroll();
}