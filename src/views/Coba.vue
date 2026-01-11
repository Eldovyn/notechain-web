<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { NOTECHAIN_ADDRESS } from "@/composables/useNoteChain";
import { useThirdwebWallet } from "@/composables/useThirdwebWallet";
import { useNoteChain } from "@/composables/useNoteChain";
import ConnectWalletButton from "@/components/ConnectWalletButton.vue";

const { account, isConnecting, autoReconnect } = useThirdwebWallet();
const isConnected = computed(() => !!account.value?.address);
const address = computed(() => account.value?.address ?? "");

const { notes, loadingNotes, writing, txHash, contractError, refreshNotes, createNote } = useNoteChain(account);

const fTitle = ref("");
const fContent = ref("");
const fSummary = ref("");
const fTags = ref("");

function shortAddr(a: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function onCreateNote() {
  const tags = fTags.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await createNote({
    title: fTitle.value,
    content: fContent.value,
    summary: fSummary.value,
    tags,
  });

  fTitle.value = "";
  fContent.value = "";
  fSummary.value = "";
  fTags.value = "";
}

onMounted(() => {
  autoReconnect(); 
});
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-5 p-4">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">NoteChain</h1>
        <p class="mt-1 text-sm text-gray-500">
          Contract: <span class="font-mono">{{ shortAddr(NOTECHAIN_ADDRESS) }}</span> • Chain 31337 (Hardhat)
        </p>
      </div>

      <ConnectWalletButton chainLabel="Hardhat (31337) • Local" />
    </div>

    <div v-if="isConnected" class="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs text-gray-500">Connected Address</div>
          <div class="truncate font-mono text-sm text-gray-900" :title="address">{{ address }}</div>
        </div>

        <button
          type="button"
          class="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loadingNotes"
          @click="refreshNotes"
        >
          <span class="inline-flex items-center gap-2">
            <span v-if="loadingNotes" class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            {{ loadingNotes ? "Loading..." : "Refresh Notes" }}
          </span>
        </button>
      </div>

      <!-- Alerts -->
      <div
        v-if="contractError"
        class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ contractError }}
      </div>

      <div
        v-if="txHash"
        class="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
      >
        Tx sent: <span class="font-mono">{{ txHash }}</span>
      </div>

      <!-- Form + List -->
      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <!-- FORM -->
        <div class="rounded-3xl border border-gray-200 bg-gray-50 p-4">
          <div class="mb-3">
            <h3 class="text-sm font-semibold text-gray-900">Create note</h3>
            <p class="mt-1 text-xs text-gray-500">Simpan note ke blockchain (Hardhat local).</p>
          </div>

          <div class="grid gap-3">
            <label class="grid gap-1">
              <span class="text-xs font-medium text-gray-700">Title</span>
              <input
                v-model="fTitle"
                class="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Judul note…"
              />
            </label>

            <label class="grid gap-1">
              <span class="text-xs font-medium text-gray-700">Content</span>
              <textarea
                v-model="fContent"
                rows="4"
                class="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Isi note…"
              />
            </label>

            <label class="grid gap-1">
              <span class="text-xs font-medium text-gray-700">Summary</span>
              <input
                v-model="fSummary"
                class="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Ringkasan singkat…"
              />
            </label>

            <label class="grid gap-1">
              <span class="text-xs font-medium text-gray-700">Tags</span>
              <input
                v-model="fTags"
                class="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="web3,notes,hardhat"
              />
              <span class="text-[11px] text-gray-500">Pisahkan dengan koma.</span>
            </label>

            <div class="flex justify-end">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isConnecting || writing"
                @click="onCreateNote"
              >
                <span
                  v-if="isConnecting || writing"
                  class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-white"
                />
                {{ writing ? "Submitting..." : "Create Note" }}
              </button>
            </div>
          </div>
        </div>

        <!-- LIST -->
        <div class="rounded-3xl border border-gray-200 p-4">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Notes</h3>
              <p class="mt-1 text-xs text-gray-500">Total: {{ notes.length }}</p>
            </div>
            <span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              Chain 31337
            </span>
          </div>

          <div
            v-if="!notes.length"
            class="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500"
          >
            Belum ada note.
          </div>

          <div v-else class="grid gap-3">
            <div
              v-for="n in notes"
              :key="String(n.id)"
              class="rounded-3xl border border-gray-200 p-4 transition hover:bg-gray-50"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-gray-900">{{ n.title }}</div>
                  <div class="mt-1 text-xs text-gray-500">{{ n.summary }}</div>
                </div>
                <div class="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
                  #{{ String(n.id) }}
                </div>
              </div>

              <div class="mt-3 whitespace-pre-wrap text-sm text-gray-700">{{ n.content }}</div>

              <div class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="t in n.tags"
                  :key="t"
                  class="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                >
                  {{ t }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not connected -->
    <div v-else class="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
      <div class="font-semibold text-gray-900">Belum connect wallet.</div>
      <p class="mt-1 text-gray-500">
        Klik <span class="font-semibold">Connect Wallet</span> di kanan atas untuk mulai baca/tulis note on-chain.
      </p>
    </div>
  </div>
</template>
