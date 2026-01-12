<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from "vue";
import type { Wallet } from "thirdweb/wallets";
import { getWalletBalance } from "thirdweb/wallets";
import { prepareTransaction, sendTransaction, waitForReceipt, watchBlockNumber } from "thirdweb";
import { isAddress, toWei } from "thirdweb/utils";

import { useThirdwebWallet } from "@/composables/useThirdwebWallet";
import { client } from "@/utils/clientThirdWeb";
import { hardhatLocal } from "@/composables/useNoteChain";

type Props = {
  autoReconnectOnMount?: boolean;
  showInstalledSection?: boolean;
  connectLabel?: string;
};

const props = withDefaults(defineProps<Props>(), {
  autoReconnectOnMount: false,
  showInstalledSection: true,
  connectLabel: "Connect Wallet",
});

const emit = defineEmits<{
  (e: "connected", payload: { address: string }): void;
  (e: "disconnected"): void;
}>();

const {
  account,
  isConnecting,
  connectWith,
  disconnect,
  walletOptions,
  loadInstalledWallets,
  autoReconnect,
} = useThirdwebWallet();

const isConnected = computed(() => !!account.value?.address);
const address = computed(() => account.value?.address ?? "");

// ---------- Address truncate (real, bukan cuma CSS)
function truncateAddress(addr: string, start = 6, end = 4) {
  if (!addr) return "";
  if (addr.length <= start + end) return addr;
  return `${addr.slice(0, start)}…${addr.slice(-end)}`;
}
const displayAddress = computed(() => truncateAddress(address.value));

// ---------- Modals
const open = ref(false); // connect modal
const accountOpen = ref(false);
const sendOpen = ref(false);
const receiveOpen = ref(false);

function closeAllModals() {
  open.value = false;
  accountOpen.value = false;
  sendOpen.value = false;
  receiveOpen.value = false;
}

function openConnectModal() {
  closeAllModals();
  open.value = true;
}

function openAccountModal() {
  if (!isConnected.value) return;
  closeAllModals();
  accountOpen.value = true;
  refreshBalance();
}

function openSendModal() {
  if (!isConnected.value) return;
  closeAllModals();
  sendError.value = "";
  lastTxHash.value = "";
  sendOpen.value = true;
}

function openReceiveModal() {
  if (!isConnected.value) return;
  closeAllModals();
  receiveOpen.value = true;
  refreshBalance();
}

// ---------- Search
const q = ref("");

// ---------- Balance
const balanceText = ref<string>("");
const balanceSymbol = ref<string>("ETH");
const balanceLoading = ref(false);

async function refreshBalance() {
  if (!address.value) {
    balanceText.value = "";
    balanceSymbol.value = "ETH";
    return;
  }

  balanceLoading.value = true;
  try {
    const b = await getWalletBalance({
      address: address.value,
      client,
      chain: hardhatLocal,
    });

    const n = Number.parseFloat(b.displayValue);
    balanceText.value = Number.isFinite(n) ? n.toFixed(4) : b.displayValue;
    balanceSymbol.value = b.symbol;
  } catch {
    balanceText.value = "";
    balanceSymbol.value = "ETH";
  } finally {
    balanceLoading.value = false;
  }
}

// address berubah => refresh balance + restart watcher (lihat watcher di bawah)
watch(
  () => address.value,
  () => refreshBalance(),
  { immediate: true },
);

// ---------- Installed wallets (EIP-6963)
const installedWallets = ref<Wallet[]>([]);
const installedIds = computed(() => new Set(installedWallets.value.map((w) => w.id)));

const otherWalletOptions = computed(() =>
  walletOptions.value.filter((opt) => !installedIds.value.has(opt.id)),
);

const labelById = computed(() => new Map(walletOptions.value.map((o) => [o.id, o.label])));

const FRIENDLY: Record<string, string> = {
  "io.metamask": "MetaMask",
  "com.coinbase.wallet": "Coinbase Wallet",
  "me.rainbow": "Rainbow",
  "io.rabby": "Rabby",
  "com.brave.wallet": "Brave Wallet",
  "io.zerion": "Zerion",
  "io.exodus": "Exodus",
  "app.phantom": "Phantom",
  "com.trustwallet.app": "Trust Wallet",
};

function titleCase(s: string | undefined) {
  if (!s) return s;
  return s[0]?.toUpperCase() + s.slice(1);
}

function humanizeWalletId(id: string) {
  const parts = id.split(".");
  const cleaned = parts
    .filter((p) => !["io", "com", "me", "app", "org", "net", "xyz"].includes(p))
    .join(" ");

  return cleaned
    .split(/[\s_-]+/)
    .map(titleCase)
    .join(" ")
    .replace(/\bMetamask\b/i, "MetaMask")
    .replace(/\bCoinbase\b/i, "Coinbase");
}

function walletDisplayName(id: string) {
  return labelById.value.get(id as any) ?? FRIENDLY[id] ?? humanizeWalletId(id);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

const filteredInstalled = computed(() => {
  const term = q.value.trim().toLowerCase();
  if (!term) return installedWallets.value;
  return installedWallets.value.filter((w) => {
    const n = walletDisplayName(w.id).toLowerCase();
    return n.includes(term) || w.id.toLowerCase().includes(term);
  });
});

const filteredOther = computed(() => {
  const term = q.value.trim().toLowerCase();
  const base = otherWalletOptions.value;
  if (!term) return base;
  return base.filter((opt) => {
    const n = opt.label.toLowerCase();
    return n.includes(term) || String(opt.id).toLowerCase().includes(term);
  });
});

// ---------- Connect / Disconnect
async function connectInstalled(w: Wallet) {
  await connectWith(w.id);
  emit("connected", { address: address.value });
  closeAllModals();
  refreshBalance();
}

async function connectOther(walletId: any) {
  await connectWith(walletId);
  emit("connected", { address: address.value });
  closeAllModals();
  refreshBalance();
}

async function doDisconnect() {
  stopReceiveWatcher();
  await disconnect();
  emit("disconnected");
  closeAllModals();
}

// ---------- Copy Address
const copied = ref(false);
async function copyAddress() {
  if (!address.value) return;
  try {
    await navigator.clipboard.writeText(address.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 900);
  } catch {
    // ignore
  }
}

// ---------- Send (native ETH)
const sendTo = ref("");
const sendAmount = ref("");
const sendLoading = ref(false);
const sendError = ref<string>("");
const lastTxHash = ref<string>("");

async function sendNative() {
  sendError.value = "";
  lastTxHash.value = "";

  if (!account.value) {
    sendError.value = "Wallet belum terkoneksi.";
    return;
  }

  const to = sendTo.value.trim();
  const amt = sendAmount.value.trim();

  if (!isAddress(to)) {
    sendError.value = "Alamat tujuan tidak valid.";
    return;
  }

  const n = Number(amt);
  if (!amt || !Number.isFinite(n) || n <= 0) {
    sendError.value = "Amount harus angka > 0.";
    return;
  }

  sendLoading.value = true;
  try {
    const tx = prepareTransaction({
      chain: hardhatLocal,
      client,
      to,
      value: toWei(amt),
    });

    const { transactionHash } = await sendTransaction({
      account: account.value as any,
      transaction: tx,
    });

    lastTxHash.value = transactionHash;

    await waitForReceipt({
      client,
      chain: hardhatLocal,
      transactionHash,
    });

    await refreshBalance();
    sendTo.value = "";
    sendAmount.value = "";
    closeAllModals();
  } catch (e: any) {
    sendError.value = e?.message ?? String(e);
  } finally {
    sendLoading.value = false;
  }
}

// ---------- Receive watcher (refresh balance tiap block baru)
let unwatchBlocks: null | (() => void) = null;

function startReceiveWatcher() {
  stopReceiveWatcher();
  if (!isConnected.value || !address.value) return;

  unwatchBlocks = watchBlockNumber({
    client,
    chain: hardhatLocal,
    onNewBlockNumber: () => {
      refreshBalance();
    },
    onError: () => {
      // ignore
    },
  });
}

function stopReceiveWatcher() {
  if (unwatchBlocks) {
    unwatchBlocks();
    unwatchBlocks = null;
  }
}

// Saat connect/address berubah: nyalakan watcher
watch(
  () => address.value,
  () => {
    if (isConnected.value) startReceiveWatcher();
    else stopReceiveWatcher();
  },
  { immediate: true },
);

// ---------- Keyboard & body lock
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") closeAllModals();
}

const anyModalOpen = computed(() => open.value || accountOpen.value || sendOpen.value || receiveOpen.value);

watch(anyModalOpen, (v) => {
  if (v) {
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);
  } else {
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKeydown);
  }
});

// Connect modal side-effects
watch(open, (v) => {
  if (!v) return;
  installedWallets.value = props.showInstalledSection ? loadInstalledWallets() : [];
  q.value = "";
  setTimeout(() => {
    const el = document.getElementById("wallet-search") as HTMLInputElement | null;
    el?.focus();
  }, 50);
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onKeydown);
  stopReceiveWatcher();
});

onMounted(() => {
  if (props.autoReconnectOnMount) {
    autoReconnect();
  }
});
</script>

<template>
  <button
    v-if="!isConnected"
    type="button"
    class="group inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:opacity-60"
    :disabled="isConnecting"
    @click="openConnectModal"
  >
    <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm">
      <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
        <path
          d="M3 7a3 3 0 0 1 3-3h13a1 1 0 1 1 0 2H6a1 1 0 0 0 0 2h14a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7Zm17 5h-5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5v-4Z"
        />
      </svg>
    </span>

    <span class="flex flex-col items-start leading-tight">
      <span>{{ isConnecting ? "Connecting..." : connectLabel }}</span>
      <span class="text-[11px] font-medium text-gray-500">Choose extension / mobile wallet</span>
    </span>

    <span v-if="isConnecting" class="ml-2 inline-flex items-center">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
    </span>
  </button>

  <div v-else class="flex items-center gap-3">
    <button
      type="button"
      class="flex bg-white items-center gap-3 rounded-2xl border border-gray-200 px-4 py-2 text-left shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
      @click="openAccountModal"
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white">
        {{ initials("Wallet") }}
      </div>
      <div class="min-w-0">
        <div class="max-w-[140px] text-center truncate font-mono text-xs text-gray-900" :title="address">
          {{ displayAddress }}
        </div>
        <div class="max-w-[140px] text-center mt-1 text-[11px] text-gray-500">
          {{ balanceLoading ? "…" : `${balanceText} ${balanceSymbol}` }}
        </div>
      </div>
    </button>
  </div>

  <transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="accountOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Account Info"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeAllModals" />

      <transition
        enter-active-class="transition ease-out duration-150"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
          <div class="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-gray-900">Account</h3>
                <p class="mt-1 text-sm text-gray-500">Informasi wallet kamu.</p>
              </div>

              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                @click="closeAllModals"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div class="px-5 py-4">
            <div class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-base font-bold text-white">
                {{ initials("Wallet") }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="truncate font-mono text-sm text-gray-900" :title="address">
                  {{ displayAddress }}
                </div>
                <div class="text-xs text-gray-500">
                  Balance • {{ balanceLoading ? "…" : `${balanceText} ${balanceSymbol}` }}
                </div>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                class="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                @click="copyAddress"
              >
                {{ copied ? "Copied!" : "Copy Address" }}
              </button>

              <button
                type="button"
                class="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                @click="refreshBalance"
              >
                Refresh Balance
              </button>

              <button
                type="button"
                class="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                @click="openSendModal"
              >
                Send
              </button>

              <button
                type="button"
                class="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                @click="openReceiveModal"
              >
                Receive
              </button>
            </div>

            <button
              type="button"
              class="mt-3 w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              @click="doDisconnect"
            >
              Disconnect
            </button>
          </div>

          <div class="border-t border-gray-100 bg-white px-5 py-4">
            <button
              type="button"
              class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              @click="closeAllModals"
            >
              Close
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>

  <transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="sendOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Send">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeAllModals" />

      <div class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Send</h3>
              <p class="mt-1 text-sm text-gray-500">Kirim native coin (ETH) di chain ini.</p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              @click="closeAllModals"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="px-5 py-4 space-y-3">
          <div>
            <div class="text-xs font-semibold text-gray-500">To Address</div>
            <input
              v-model="sendTo"
              class="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              placeholder="0x..."
            />
          </div>

          <div>
            <div class="text-xs font-semibold text-gray-500">Amount (ETH)</div>
            <input
              v-model="sendAmount"
              class="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              placeholder="0.01"
              inputmode="decimal"
            />
          </div>

          <div v-if="sendError" class="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ sendError }}
          </div>

          <div v-if="lastTxHash" class="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            Tx Hash: <span class="font-mono">{{ lastTxHash }}</span>
          </div>

          <button
            type="button"
            class="w-full rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
            :disabled="sendLoading"
            @click="sendNative"
          >
            {{ sendLoading ? "Sending..." : "Send" }}
          </button>
        </div>

        <div class="border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
            @click="closeAllModals"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </transition>

  <transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="receiveOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Receive">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeAllModals" />

      <div class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Receive</h3>
              <p class="mt-1 text-sm text-gray-500">Gunakan address ini untuk menerima dana.</p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              @click="closeAllModals"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="px-5 py-4">
          <div class="rounded-2xl border border-gray-200 p-4">
            <div class="text-xs font-semibold text-gray-500">Your Address</div>
            <div class="mt-1 truncate font-mono text-sm text-gray-900" :title="address">
              {{ displayAddress }}
            </div>
            <div class="mt-2 text-xs text-gray-500">
              Balance • {{ balanceLoading ? "…" : `${balanceText} ${balanceSymbol}` }}
            </div>
            <div class="mt-2 text-[11px] text-gray-500">(Auto-refresh balance tiap block baru)</div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              class="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
              @click="copyAddress"
            >
              {{ copied ? "Copied!" : "Copy Address" }}
            </button>

            <button
              type="button"
              class="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
              @click="refreshBalance"
            >
              Refresh
            </button>
          </div>
        </div>

        <div class="border-t border-gray-100 bg-white px-5 py-4">
          <button
            type="button"
            class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
            @click="closeAllModals"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </transition>

  <transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Pilih Wallet">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeAllModals" />

      <transition
        enter-active-class="transition ease-out duration-150"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
          <div class="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-gray-900">Pilih Wallet</h3>
                <p class="mt-1 text-sm text-gray-500">Installed wallets terdeteksi via EIP-6963 discovery.</p>
              </div>

              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                @click="closeAllModals"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div class="mt-3">
              <div class="relative">
                <input
                  id="wallet-search"
                  v-model="q"
                  class="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Cari wallet…"
                />
                <svg
                  viewBox="0 0 24 24"
                  class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 overflow-visible"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="max-h-[70vh] overflow-auto px-5 py-4">
            <div v-if="showInstalledSection && filteredInstalled.length" class="mb-5">
              <div class="mb-2 flex items-center justify-between">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Detected (Installed)</div>
                <span class="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  {{ filteredInstalled.length }}
                </span>
              </div>

              <div class="grid gap-2">
                <button
                  v-for="w in filteredInstalled"
                  :key="w.id"
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left shadow-sm transition hover:enabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isConnecting"
                  @click="connectInstalled(w)"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900 text-sm font-bold text-white">
                      {{ initials(walletDisplayName(w.id)) }}
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-sm font-semibold text-gray-900">{{ walletDisplayName(w.id) }}</div>
                      <div class="truncate text-xs text-gray-500">{{ w.id }}</div>
                    </div>
                  </div>

                  <span class="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">Installed</span>
                </button>
              </div>
            </div>

            <div>
              <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Other wallets</div>

              <div v-if="filteredOther.length" class="grid gap-2">
                <button
                  v-for="w in filteredOther"
                  :key="w.id"
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left shadow-sm transition hover:enabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isConnecting"
                  @click="connectOther(w.id)"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-sm font-bold text-gray-800">
                      {{ initials(w.label) }}
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-sm font-semibold text-gray-900">{{ w.label }}</div>
                      <div class="truncate text-xs text-gray-500">{{ w.id }}</div>
                    </div>
                  </div>

                  <span class="shrink-0 text-xs font-medium text-gray-500">Select</span>
                </button>
              </div>

              <div v-else class="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                Tidak ada hasil untuk “{{ q }}”.
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 bg-white px-5 py-4">
            <button
              type="button"
              class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              @click="closeAllModals"
            >
              Close
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
