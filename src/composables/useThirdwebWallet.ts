import { ref, computed } from "vue";
import type { Account, Wallet, WalletId } from "thirdweb/wallets";
import { createWallet, getInstalledWallets } from "thirdweb/wallets";
import { autoConnect } from "thirdweb/wallets";
import { client } from "@/utils/clientThirdWeb";

type WalletOption = { id: WalletId; label: string };

const LS_WALLET_ID = "tw:lastWalletId";
const LS_ADDRESS = "tw:lastAddress";

const walletOptions = ref<WalletOption[]>([
    { id: "io.metamask", label: "MetaMask" },
    { id: "com.coinbase.wallet", label: "Coinbase Wallet" },
    { id: "me.rainbow", label: "Rainbow" },
]);

// singleton state (dipakai lintas komponen)
const activeWallet = ref<Wallet | null>(null);
const activeWalletId = ref<WalletId | null>(null);
const account = ref<Account | null>(null);
const isConnecting = ref(false);

const isConnected = computed(() => !!account.value?.address);

function saveSession(id: WalletId | null, addr?: string | null) {
    if (!id) {
        localStorage.removeItem(LS_WALLET_ID);
        localStorage.removeItem(LS_ADDRESS);
        return;
    }
    localStorage.setItem(LS_WALLET_ID, id);
    if (addr) localStorage.setItem(LS_ADDRESS, addr);
}

function clearSession() {
    localStorage.removeItem(LS_WALLET_ID);
    localStorage.removeItem(LS_ADDRESS);
}

function readLastWalletId(): WalletId | null {
    const raw = localStorage.getItem(LS_WALLET_ID);
    if (!raw) return null;

    const ok = walletOptions.value.some((w) => w.id === (raw as WalletId));
    return ok ? (raw as WalletId) : null;
}

function getWalletConnectConfig() {
    const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
    if (!projectId) return undefined;

    return {
        projectId,
        showQrModal: true,
        appMetadata: {
            name: "note.chain",
            url: window.location.origin,
            description: "Notes dapp",
            logoUrl: `${window.location.origin}/logo.png`,
        },
    };
}

function bindWalletEvents(w: Wallet) {
    w.subscribe("accountChanged", (nextAcc) => {
        account.value = nextAcc ?? null;
        if (nextAcc?.address) saveSession(w.id, nextAcc.address);
    });

    w.subscribe("disconnect", () => {
        activeWallet.value = null;
        activeWalletId.value = null;
        account.value = null;
        clearSession();
    });
}

async function connectWith(walletId: WalletId, opts?: { forceWalletConnectQr?: boolean }) {
    if (isConnecting.value) return;

    try {
        isConnecting.value = true;

        // kalau ganti wallet, disconnect dulu
        if (activeWallet.value && activeWalletId.value && activeWalletId.value !== walletId) {
            await activeWallet.value.disconnect();
            activeWallet.value = null;
            activeWalletId.value = null;
            account.value = null;
        }

        const w = createWallet(walletId);

        const wc = getWalletConnectConfig();
        const acc = await w.connect({
            client,
            ...(opts?.forceWalletConnectQr && wc
                ? {
                    walletConnect: wc,
                }
                : wc
                    ? { walletConnect: wc }
                    : {}),
        });

        activeWallet.value = w;
        activeWalletId.value = walletId;
        account.value = acc;

        saveSession(walletId, acc.address);
        bindWalletEvents(w);
    } finally {
        isConnecting.value = false;
    }
}

async function disconnect() {
    if (!activeWallet.value) return;
    await activeWallet.value.disconnect();
    activeWallet.value = null;
    activeWalletId.value = null;
    account.value = null;
    clearSession();
}

async function autoReconnect() {
    if (isConnecting.value) return;

    const lastId = readLastWalletId();
    const wc = getWalletConnectConfig();

    try {
        isConnecting.value = true;

        if (lastId) {
            const w = createWallet(lastId);
            const acc = await w.autoConnect({
                client,
                ...(wc ? { walletConnect: wc } : {}),
            } as any);

            activeWallet.value = w;
            activeWalletId.value = lastId;
            account.value = acc;

            saveSession(lastId, acc.address);
            bindWalletEvents(w);
            return;
        }

        await autoConnect({
            client,
            wallets: walletOptions.value.map((o) => createWallet(o.id)),
            onConnect: (w) => {
                activeWallet.value = w;
                activeWalletId.value = w.id;
                account.value = w.getAccount?.() ?? null;
                if (account.value?.address) saveSession(w.id, account.value.address);
                bindWalletEvents(w);
            },
        });
    } catch {
        clearSession();
    } finally {
        isConnecting.value = false;
    }
}

function loadInstalledWallets() {
    return getInstalledWallets();
}

export function useThirdwebWallet() {
    return {
        walletOptions,
        activeWallet,
        activeWalletId,
        account,
        isConnected,
        isConnecting,

        connectWith,
        disconnect,
        autoReconnect,
        loadInstalledWallets,

        lastAddress: () => localStorage.getItem(LS_ADDRESS) || "",
    };
}
