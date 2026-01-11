import { axiosInstance } from "@/utils/axios";

export const noteService = {
    async createNote(input: NoteInput) {
        const response = await axiosInstance.post('/note', input, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return { response: response, data: response.data };
    },
};