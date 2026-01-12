<script setup lang="ts">
import { cards } from '@/stores/card';
import ConnectWalletButton from "@/components/ConnectWalletButton.vue";
import { useThirdwebWallet } from "@/composables/useThirdwebWallet";
import { onMounted } from "vue";

const { autoReconnect } = useThirdwebWallet();

onMounted(() => {
  autoReconnect(); 
});
</script>

<template>
    <nav class="navbar fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div class="flex-1 flex-row">
            <a class="btn btn-ghost text-xl">note.chain</a>
            <p class="text-sm ps-5 text-gray-500">{{ cards.length }} Notes</p>
        </div>
        <div class="flex-none">
                <ConnectWalletButton />
        </div>
    </nav>
</template>