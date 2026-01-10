import { useQuery } from '@tanstack/vue-query'
import { noteService } from '@/api/note';

export const useGetAllNotes = (token: string) => {
    return useQuery({
        queryKey: ["get-note", token],
        queryFn: async () => {
            const response = await noteService.getNotes(token);
            return response.data;
        },
        enabled: !!token,
        refetchOnWindowFocus: false,
        retry: false,
    });
};