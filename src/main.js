// PRESENTATION MOCKUP BUILD.
// This import installs a fetch() interceptor that answers every /api/* call with
// in-memory sample data, so the frontend runs as a static demo with no backend.
// Remove this single line to point the app back at the real API.
import './mock/api.js'

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router.js'

createApp(App).use(router).mount('#app')
