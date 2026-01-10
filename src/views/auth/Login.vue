<script setup lang="ts">
import Input from '@/components/ui/input/Input.vue';
import Button from '@/components/ui/button/Button.vue';
import Label from '@/components/ui/label/Label.vue';
import { AiOutlineMail, AiOutlineEye } from 'vue-icons-lib/ai'
import { BxSolidLockAlt } from 'vue-icons-lib/bx'
import { ref, reactive } from 'vue';
import { CiEyeOff } from 'vue-icons-lib/ci'
import { authService } from '@/api/auth';
import { AxiosError } from 'axios';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { useRouter } from 'vue-router';
import { useCookies } from '@/composables/useCookies';

const cookies = useCookies()

const router = useRouter()

const goToHome = () => {
    router.push('/')
}

const inputLogin = reactive<LoginInput>({
    email: '',
    password: '',
    provider: ''
})

const isSubmitting = ref(false);

const showPassword = ref(false);

function toggleShowPassword() {
    showPassword.value = !showPassword.value;
}

const { mutate } = useMutation({
    mutationFn: async (input: LoginInput) => {
        input.provider = 'auth_internal'
        const { data } = await authService.loginApi(input)
        return data
    },
    onError: async (error: AxiosError<ErrorResponseLogin>) => {
        const { response } = error
        const message = response?.data.message
        toast.error(message || 'something went wrong')
    },
    onSuccess: async (data: SuccessResponseLogin) => {
        const { message, token } = data
        toast.success(message)
        cookies.set('accessToken', token.access_token)
        goToHome()
    },
})

const onSubmit = () => {
    if (isSubmitting.value) return;

    isSubmitting.value = true;
    mutate({ ...inputLogin })
    isSubmitting.value = false;
}
</script>

<template>
    <main
        class="min-h-screen w-full bg-linear-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-10">
        <div class="w-full max-w-md">
            <form class="bg-white rounded-2xl p-8 ring-1 ring-black/5 space-y-6" @submit.prevent="onSubmit"
                autocomplete="on">
                <header class="text-center space-y-2">
                    <h1 class="text-2xl font-bold tracking-tight text-slate-900">
                        Back to what matters
                    </h1>
                    <p class="text-sm text-slate-500">
                        Sign in to your account to continue
                    </p>
                </header>

                <section class="space-y-4">
                    <div class="space-y-2">
                        <Label class="ps-1" for="email">Email</Label>

                        <div class="relative">
                            <AiOutlineMail
                                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                            <Input id="email" type="text" inputmode="email" autocomplete="email"
                                placeholder="name@example.com" class="w-full pl-10" v-model="inputLogin.email" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="ps-1" for="password">Password</Label>

                            <a class="text-sm text-blue-600 hover:underline" href="/forgot-password">
                                Forgot password?
                            </a>
                        </div>

                        <div class="relative">
                            <BxSolidLockAlt
                                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                            <Input id="password" :type="showPassword ? 'text' : 'password'"
                                autocomplete="current-password" placeholder="Enter your password"
                                class="w-full pl-10 pr-10" v-model="inputLogin.password" />

                            <button type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                @click="toggleShowPassword" aria-label="Toggle password visibility"
                                :aria-pressed="showPassword">
                                <AiOutlineEye class="w-5 h-5" v-if="showPassword" />
                                <CiEyeOff class="w-5 h-5" v-else />
                            </button>
                        </div>
                    </div>

                    <Button class="w-full cursor-pointer mt-2" type="submit" :disabled="isSubmitting">
                        <span v-if="!isSubmitting">Login</span>
                        <span v-else>Logging in…</span>
                    </Button>
                </section>

                <footer class="pt-2">
                    <p class="text-center text-sm text-slate-500">
                        Don't have an account?
                        <a class="font-semibold text-slate-900 hover:underline" href="/register">
                            Sign Up
                        </a>
                    </p>
                </footer>
            </form>
        </div>
    </main>
</template>

<style scoped></style>