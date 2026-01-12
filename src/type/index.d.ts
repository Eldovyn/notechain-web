declare interface Card {
    id: bigint;
    title: string;
    content: string;
    summary: string;
    tags: string[];
    createdAt: bigint;
    updatedAt: bigint;
}