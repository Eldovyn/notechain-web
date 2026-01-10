import { createApp } from 'vue'
import './style.css'
import 'vue-sonner/style.css'
import App from './App.vue'
import router from './router'
import { VueQueryPlugin } from '@tanstack/vue-query';
import VueCookies from 'vue3-cookies'

createApp(App).use(VueQueryPlugin).use(router).use(VueCookies).mount('#app')
