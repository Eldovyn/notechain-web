import { createRouter, createWebHistory } from 'vue-router'
import Coba from '@/views/Coba.vue'
import Home from '@/views/Home.vue'

const routes = [
    { path: '/', component: Home, meta: { showNavbar: true } },
    { path: '/coba', component: Coba, meta: { showNavbar: false } },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router