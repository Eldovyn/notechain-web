import { axiosInstance } from "@/utils/axios";

export const noteService = {
    async createNote(input: NoteInput, token: string) {
        const response = await axiosInstance.post('/note', input, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        return { response: response, data: response.data };
    },
    async getNotes(token: string) {
        const response = await axiosInstance.get('/note', {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        return { response: response, data: response.data };
    },
    async deleteNote(id: string, token: string) {
        const response = await axiosInstance.delete(`/note/${id}`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        return { response: response, data: response.data };
    },
    async updateNote(id: string, input: NoteInput, token: string) {
        const response = await axiosInstance.patch(`/note/${id}`, input, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        return { response: response, data: response.data };
    },
};