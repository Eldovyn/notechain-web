import { ref, watch, type Ref } from "vue";
import { defineChain, getContract, readContract, prepareContractCall, sendTransaction } from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { client } from "@/utils/clientThirdWeb";
import { noteChainAbi } from "@/abi/NoteChain.abi";
import { cards } from "@/stores/card";

export const hardhatLocal = defineChain({
    id: 31337,
    rpc: import.meta.env.VITE_RPC_URL as string,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
});

export const NOTECHAIN_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F" as const;

export type Note = {
    id: bigint;
    title: string;
    content: string;
    summary: string;
    tags: string[];
    createdAt: bigint;
    updatedAt: bigint;
};

const noteChain = getContract({
    client,
    chain: hardhatLocal,
    address: NOTECHAIN_ADDRESS,
    abi: noteChainAbi,
});

export function useNoteChain(account: Ref<Account | undefined | null>) {
    const loadingNotes = ref(false);
    const writing = ref(false);
    const txHash = ref<string>("");
    const contractError = ref<string>("");

    async function refreshNotes() {
        if (!account.value?.address) return;

        loadingNotes.value = true;
        contractError.value = "";
        try {
            const call = {
                contract: noteChain,
                method:
                    "getNotes",
                params: [] as const,
                from: account.value.address as `0x${string}`,
            } as any;

            const data = await readContract(call);

            cards.value = (data as any[]).map((n: any) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                summary: n.summary,
                tags: n.tags,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
            }));
        } catch (e: any) {
            contractError.value = e?.message ?? String(e);
        } finally {
            loadingNotes.value = false;
        }
    }

    async function createNote(input: { title: string; content: string; summary: string; tags: string[] }) {
        if (!account.value) {
            contractError.value = "Wallet belum connect";
            return;
        }

        txHash.value = "";
        contractError.value = "";
        writing.value = true;

        try {
            const tx = prepareContractCall({
                contract: noteChain,
                method:
                    "createNote",
                params: [input.title, input.content, input.summary, input.tags] as const,
            });

            const res = await sendTransaction({
                account: account.value,
                transaction: tx,
            });

            txHash.value = res.transactionHash;

            await refreshNotes();
        } catch (e: any) {
            contractError.value = e?.message ?? String(e);
        } finally {
            writing.value = false;
        }
    }

    watch(
        () => account.value?.address,
        (addr) => {
            if (addr) refreshNotes();
            else cards.value = [];
        },
        { immediate: true }
    );

    return {
        cards,
        loadingNotes,
        writing,
        txHash,
        contractError,

        refreshNotes,
        createNote,

        noteChain,
    };
}
