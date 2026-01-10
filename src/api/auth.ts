import { axiosInstance } from "@/utils/axios";

export const authService = {
    async registerApi(input: RegisterInput) {
        const response = await axiosInstance.post('/auth/register', input);
        return { response: response, data: response.data };
    },
    async loginApi(input: LoginInput) {
        const response = await axiosInstance.post('/auth/login', input);
        return { response: response, data: response.data };
    }
};