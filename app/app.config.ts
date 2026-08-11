export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      success: 'emerald',
      error: 'rose',
      warning: 'amber',
      info: 'sky',
      neutral: 'slate'
    },
    modal: {
      variants: {
        overlay: {
          true: {
            overlay: 'bg-inverted/70 backdrop-blur-sm'
          }
        }
      }
    }
  }
})