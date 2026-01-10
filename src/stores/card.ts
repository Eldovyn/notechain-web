import { ref } from "vue";

export const cards = ref<Card[]>([]);
export const selectedCard = ref<Card | null>(null);
