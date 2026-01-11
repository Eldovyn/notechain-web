<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from "vue";
import type { Wallet } from "thirdweb/wallets";
import { useThirdwebWallet } from "@/composables/useThirdwebWallet";

type Props = {
  /** autoReconnect saat mount component (opsional). Lebih ideal taruh di App.vue sekali. */
  autoReconnectOnMount?: boolean;
  /** tampilkan badge kecil “Installed” dan section installed wallets */
  showInstalledSection?: boolean;
  /** label tombol */
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

const open = ref(false);
const q = ref(""); // search

// installed wallets (EIP-6963)
const installedWallets = ref<Wallet[]>([]);
const installedIds = computed(() => new Set(installedWallets.value.map((w) => w.id)));

const otherWalletOptions = computed(() =>
  walletOptions.value.filter((opt) => !installedIds.value.has(opt.id)),
);

// Friendly names
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

function shortAddr(a: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
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

async function connectInstalled(w: Wallet) {
  await connectWith(w.id);
  emit("connected", { address: address.value });
  open.value = false;
}

async function connectOther(walletId: any) {
  await connectWith(walletId);
  emit("connected", { address: address.value });
  open.value = false;
}

async function doDisconnect() {
  await disconnect();
  emit("disconnected");
}

function close() {
  open.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

watch(open, (v) => {
  if (v) {
    // thirdweb: discover installed extension wallets via EIP-6963 :contentReference[oaicite:2]{index=2}
    installedWallets.value = props.showInstalledSection ? loadInstalledWallets() : [];
    q.value = "";
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);

    setTimeout(() => {
      const el = document.getElementById("wallet-search") as HTMLInputElement | null;
      el?.focus();
    }, 50);
  } else {
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKeydown);
  }
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onKeydown);
});

onMounted(() => {
  if (props.autoReconnectOnMount) {
    autoReconnect();
  }
});
</script>

<template>
  <!-- Not connected -->
  <button
    v-if="!isConnected"
    type="button"
    class="group inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:opacity-60"
    :disabled="isConnecting"
    @click="open = true"
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

  <!-- Connected -->
  <div v-else class="flex items-center gap-3">
    <div class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white">
        {{ initials("Wallet") }}
      </div>
      <div class="min-w-0">
        <div class="truncate font-mono text-xs text-gray-900" :title="address">
          {{ address }}
        </div>
        <div class="mt-1 text-[11px] text-gray-500">Connected • {{ shortAddr(address) }}</div>
      </div>
    </div>

    <button
      type="button"
      class="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isConnecting"
      @click="doDisconnect"
    >
      Disconnect
    </button>
  </div>

  <!-- Modal -->
  <transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Wallet"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close" />

      <transition
        enter-active-class="transition ease-out duration-150"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
          <!-- Header -->
          <div class="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-gray-900">Pilih Wallet</h3>
                <p class="mt-1 text-sm text-gray-500">
                  Installed wallets terdeteksi via EIP-6963 discovery. :contentReference[oaicite:3]{index=3}
                </p>
              </div>

              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                @click="close"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <!-- Search -->
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
                  class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="max-h-[70vh] overflow-auto px-5 py-4">
            <!-- Installed -->
            <div v-if="showInstalledSection && filteredInstalled.length" class="mb-5">
              <div class="mb-2 flex items-center justify-between">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Detected (Installed)
                </div>
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
                      <div class="truncate text-sm font-semibold text-gray-900">
                        {{ walletDisplayName(w.id) }}
                      </div>
                      <div class="truncate text-xs text-gray-500">{{ w.id }}</div>
                    </div>
                  </div>

                  <span class="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    Installed
                  </span>
                </button>
              </div>
            </div>

            <!-- Other wallets -->
            <div>
              <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Other wallets
              </div>

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

          <!-- Footer -->
          <div class="border-t border-gray-100 bg-white px-5 py-4">
            <button
              type="button"
              class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              @click="close"
            >
              Close
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
