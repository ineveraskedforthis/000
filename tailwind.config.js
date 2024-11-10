module.exports = {
  content: [
    // Example content paths...
    './static/**/*.html',
    './static/index.html',
    './src/**/*.{js,jsx,ts,tsx,vue}',
    './js/**/*.{js,jsx,ts,tsx,vue}',
  ],
  theme: {
    fontFamily: {
      'press-start': ['"Press Start 2P"', 'cursive'],
    },
    extend: {
      backgroundImage: {
        'main-character-1-portrait': "url('../portrait-1.png')",
        // 'soul-keeper-portrait': "url('../portrait-2.png')",
      }
    }
  }
  // ...
}