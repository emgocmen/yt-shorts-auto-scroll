# YouTube Shorts Auto Scroll Extension

Professional Chrome extension that automatically scrolls to the next YouTube Shorts video when the current video ends or loops.

## 🎯 Features

- **Smart Video Detection**: Automatically detects when a YouTube Shorts video ends or loops
- **Customizable Delay**: Set delay time between 0.5-10 seconds before scrolling
- **Reliable Navigation**: Uses multiple scroll methods for maximum compatibility
- **Background Processing**: Works seamlessly without interrupting your viewing experience
- **Easy Controls**: Simple popup interface for quick settings adjustment

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your Chrome toolbar

## 📱 Usage

1. **Navigate to YouTube Shorts**: Go to any YouTube Shorts video page
2. **Extension Auto-Activates**: The extension automatically detects Shorts pages
3. **Customize Settings**: Click the extension icon to adjust settings:
   - Toggle auto-scroll on/off
   - Set delay duration (default: 1.5 seconds)
4. **Enjoy Seamless Viewing**: Videos will automatically scroll to the next one when they end

## ⚙️ Settings

- **Auto Scroll**: Enable or disable automatic scrolling
- **Delay Duration**: Time to wait after video ends before scrolling (0.5-10 seconds)

## 🔧 Developer Commands

Access these commands in the browser console (for debugging):

```javascript
// Manual scroll test
ytAutoScroll.test()

// Toggle auto-scroll
ytAutoScroll.toggle()

// Set delay (in milliseconds)
ytAutoScroll.delay(2000)

// View detailed status
ytAutoScroll.status()

// Restart observer/watcher
ytAutoScroll.restart()

// Enable debug mode
ytAutoScroll.debug(true)

// Show help
ytAutoScroll.help()
```

## 🛠️ Technical Details

- **Manifest Version**: 3
- **Permissions**: activeTab, storage, scripting, tabs
- **Supported Sites**: YouTube.com (all variants)
- **Browser Compatibility**: Chrome 88+

## 📊 Architecture

- **Content Script**: Handles video detection and scroll triggering
- **Background Script**: Manages extension lifecycle and content script injection
- **Popup Interface**: Provides user controls and status display

## 🔒 Privacy & Security

- No data collection or external communication
- All processing happens locally in your browser
- Only accesses YouTube pages (as declared in permissions)
- Open source and transparent code

## 🐛 Troubleshooting

### Extension not working?
1. Refresh the YouTube Shorts page (F5)
2. Check if you're on a valid Shorts URL (`/shorts/`)
3. Try clicking the extension icon and verify status
4. Use `ytAutoScroll.restart()` in console

### Need to reset settings?
1. Go to `chrome://extensions/`
2. Find "YouTube Shorts Auto Scroll"
3. Click "Remove" and reinstall

## 📝 Changelog

### v2.1.0 (Latest)
- **Production Ready**: Optimized logging and error handling
- **Improved Reliability**: Enhanced video detection and navigation
- **Better UX**: Professional popup interface
- **Code Quality**: Clean, maintainable codebase

### v2.0.0
- Complete rewrite with modern APIs
- Enhanced video end detection
- Multiple scroll methods for compatibility
- Improved error handling

## 👨‍💻 Developer

**Emre Göçmen**
- Email: info@emregocmen.com
- Developer

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues, questions, or suggestions:
- Email: info@emregocmen.com
- Open an issue on the repository

---

**Made with ❤️ for YouTube Shorts enthusiasts**