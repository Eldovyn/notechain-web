import { ref, watch, type Ref } from "vue";
import { getWalletBalance } from "thirdweb/wallets";
import type { Chain } from "thirdweb";
import { client } from "@/utils/clientThirdWeb";

export function useWalletBalance(address: Ref<string>, chain: Chain) {
    const balanceText = ref("");
    const symbol = ref("ETH");
    const loading = ref(false);

    async function refresh() {
        if (!address.value) {
            balanceText.value = "";
            symbol.value = "ETH";
            return;
        }

        loading.value = true;
        try {
            const b = await getWalletBalance({
                address: address.value,
                client,
                chain,
            });

            const n = Number.parseFloat(b.displayValue);
            balanceText.value = Number.isFinite(n) ? n.toFixed(4) : b.displayValue;
            symbol.value = b.symbol;
        } finally {
            loading.value = false;
        }
    }

    watch(address, refresh, { immediate: true });

    return { balanceText, symbol, loading, refresh };
}
