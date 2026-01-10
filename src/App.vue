<script setup lang="ts">
import Navbar from './components/Navbar.vue';
import { useRoute } from 'vue-router';
import { Toaster } from './components/ui/sonner';

const route = useRoute();
</script>

<template>
  <Toaster />
  <Navbar v-if="route.meta.showNavbar" />
  <router-view />
</template>

<style scoped></style>
