<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button';
import { BxRegularPlus } from 'vue-icons-lib/bx';
import { CgSearch } from 'vue-icons-lib/cg';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { BxRegularSave } from 'vue-icons-lib/bx';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cards, selectedCard } from '@/stores/card';
import { ref, reactive, watchEffect } from 'vue';
import { BxRegularTrash, BxSolidBot } from 'vue-icons-lib/bx'
import { noteService } from '@/api/note';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { useCookies } from '@/composables/useCookies';
import { AxiosError } from 'axios';
import { useGetAllNotes } from '@/composables/useNote';

const cookies = useCookies()
const accessToken = cookies.get('accessToken')

const isOpen = ref(false);
const isSubmitting = ref(false);

const form = reactive({
    title: '',
    content: '',
    summary: '',
});

const openDialog = (card?: Card) => {
    if (card) {
        selectedCard.value = card;
        form.title = (card.title ?? '') as string;
        form.content = (card.content ?? '') as string;
        form.summary = (card.summary ?? '') as string;
    } else {
        selectedCard.value = null;
        form.title = '';
        form.content = '';
        form.summary = '';
    }

    isOpen.value = true;
};

const closeDialog = () => {
    isOpen.value = false;
    selectedCard.value = null;
    form.title = '';
    form.content = '';
};

const { mutate } = useMutation({
    mutationFn: async (input: NoteInput) => {
        const { data } = await noteService.createNote(input, accessToken)
        return data
    },
    onError: async (error: AxiosError<ErrorResponseNote>) => {
        const { response } = error
        const message = response?.data.message
        toast.error(message || 'something went wrong')
    },
    onSuccess: async (data: SuccessResponseNote) => {
        const { message, data: card } = data
        cards.value = [card, ...cards.value]
        toast.success(message)
        closeDialog();
    },
})

const onSubmit = () => {
    if (isSubmitting.value) return;
    isSubmitting.value = true;

    mutate({ ...form })
    isSubmitting.value = false;
};

const onDelete = async () => {
    if (isSubmitting.value) return;
    isSubmitting.value = true;

    const { response, data } = await noteService.deleteNote(selectedCard.value?.id ?? '', accessToken)
    if (response.status !== 201) {
        cards.value = cards.value.filter((card) => card.id !== selectedCard.value?.id)
        toast.success(data.message)
    } else {
        toast.error(data.message)
    }

    closeDialog();
    isSubmitting.value = false;
}

const onEdit = async () => {
    if (isSubmitting.value) return;
    isSubmitting.value = true;

    const { response, data } = await noteService.updateNote(selectedCard.value?.id ?? '', form, accessToken)
    console.log(response, data)
    if (response.status !== 201) {
        cards.value = cards.value.map((card) => {
            if (card.id === selectedCard.value?.id) {
                return {
                    ...card,
                    title: form.title,
                    content: form.content,
                    summary: form.summary,
                }
            }
            return card
        })
        toast.success(data.message)
    } else {
        toast.error(data.message)
    }

    closeDialog();
    selectedCard.value = null
    isSubmitting.value = false;
}

const { data, isSuccess } = useGetAllNotes(accessToken ?? '')

watchEffect(() => {
    if (!isSuccess.value) return

    const payload = data.value as any
    const notes =
        Array.isArray(payload) ? payload : (payload?.data ?? [])

    cards.value = notes.slice().reverse()
})
</script>

<template>
    <main class="pt-16">
        <div class="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
            <section class="sticky top-16 z-10 border-b bg-slate-50/80 backdrop-blur pt-3">
                <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0">
                            <h1 class="text-xl font-semibold tracking-tight text-slate-900">Notes</h1>
                            <p class="text-sm text-slate-500">Create, edit, and organize your notes.</p>
                        </div>

                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:w-[60%]">
                            <div class="relative w-full sm:max-w-md">
                                <Input placeholder="Search your notes" class="w-full pl-11" />
                                <CgSearch
                                    class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>

                            <Button class="gap-2 cursor-pointer shrink-0" @click="openDialog()">
                                <BxRegularPlus />
                                New Note
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section class="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">
                <div v-if="cards.length === 0" class="rounded-2xl border border-dashed bg-white p-10 text-center">
                    <div
                        class="mx-auto mb-3 h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                        <BxRegularPlus />
                    </div>
                    <h2 class="text-lg font-semibold text-slate-900">No notes yet</h2>
                    <p class="mt-1 text-sm text-slate-500">Create your first note to get started.</p>
                    <Button class="mt-5 gap-2" @click="openDialog()">
                        <BxRegularPlus />
                        Create Note
                    </Button>
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card v-for="card in cards" :key="card.id"
                        class="group cursor-pointer border bg-white rounded-2xl shadow-sm transition hover:shadow-md hover:-translate-y-px flex flex-col h-full"
                        @click="openDialog(card)">
                        <CardHeader class="pb-3 overflow-hidden">
                            <div class="flex justify-between items-center gap-4 min-w-0">
                                <div class="min-w-0 flex-1">
                                    <CardTitle class="text-base font-semibold tracking-tight text-slate-900">
                                        <span class="block min-w-0 truncate">
                                            {{ card.title }}
                                        </span>
                                    </CardTitle>
                                </div>

                                <span
                                    class="shrink-0 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition">
                                    Click to edit
                                </span>
                            </div>
                        </CardHeader>

                        <CardContent class="text-sm text-slate-600 leading-relaxed line-clamp-4 min-h-[92px]">
                            {{ card.content }}
                        </CardContent>

                        <CardFooter class="mt-auto flex flex-row flex-wrap gap-2 pt-4">
                            <Badge v-for="tag in card.tags" :key="tag" variant="outline" class="rounded-full">
                                {{ tag }}
                            </Badge>
                        </CardFooter>
                    </Card>
                </div>
            </section>

            <Dialog v-model:open="isOpen">
                <DialogContent class="sm:max-w-xl">
                    <DialogHeader class="space-y-1">
                        <DialogTitle class="text-lg">
                            {{ selectedCard ? 'Edit Note' : 'Create New Note' }}
                        </DialogTitle>
                        <p class="text-sm text-slate-500">
                            {{ selectedCard ? 'Update your note details below.' : 'Fill in the note details below.' }}
                        </p>
                    </DialogHeader>

                    <form class="mt-4 flex flex-col gap-4" @submit.prevent="!selectedCard && onSubmit()">
                        <div class="grid gap-4">
                            <div class="grid gap-2">
                                <Label class="text-slate-700">Title</Label>
                                <Input v-model="form.title" placeholder="e.g. Meeting notes" class="w-full" />
                            </div>

                            <div class="grid gap-2">
                                <Label class="text-slate-700">Note</Label>
                                <Textarea v-model="form.content" placeholder="Write your note here…"
                                    class="min-h-[110px] w-full" />
                            </div>

                            <Separator v-if="selectedCard" />

                            <div class="rounded-2xl border bg-slate-50 p-4" v-if="selectedCard">
                                <div class="mb-2 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <BxSolidBot class="text-slate-700" />
                                        <Label class="text-slate-700">AI Summary</Label>
                                    </div>
                                    <span class="text-xs text-slate-500">Generated preview</span>
                                </div>

                                <Textarea v-model="form.summary" placeholder="AI summary will appear here…" readonly
                                    class="min-h-[90px] w-full" />
                            </div>
                        </div>

                        <Separator />

                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Button variant="destructive" type="button" v-if="selectedCard" @click="onDelete"
                                class="gap-2">
                                <BxRegularTrash class="mr-0" />
                                Delete
                            </Button>

                            <div class="flex flex-col gap-3 sm:flex-row sm:justify-end sm:ml-auto w-full">
                                <div class="flex gap-3 w-full sm:w-auto justify-end">
                                    <Button variant="outline" type="button" class="w-full sm:w-auto"
                                        @click="closeDialog">
                                        Cancel
                                    </Button>
                                    <Button class="w-full sm:w-auto gap-2" type="submit" v-if="!selectedCard">
                                        <BxRegularSave class="mr-0" />
                                        Save
                                    </Button>
                                    <Button class="w-full sm:w-auto gap-2" type="button" @click="onEdit" v-else>
                                        <BxRegularSave class="mr-0" />
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    </main>
</template>


<style scoped></style>