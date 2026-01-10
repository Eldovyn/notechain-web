<script setup lang="ts">
import Input from '@/components/ui/input/Input.vue';
import Button from '@/components/ui/button/Button.vue';
import Label from '@/components/ui/label/Label.vue';
import { AiOutlineMail } from 'vue-icons-lib/ai';
import { BxSolidLockAlt } from 'vue-icons-lib/bx';
import { CiEyeOff } from 'vue-icons-lib/ci';
import { AiOutlineEye } from 'vue-icons-lib/ai';
import { ref, reactive } from 'vue';
import { AiOutlineUser } from 'vue-icons-lib/ai'
import { AxiosError } from 'axios';
import { useMutation } from '@tanstack/vue-query';
import { authService } from '@/api/auth';
import { toast } from 'vue-sonner';
import { useRouter } from 'vue-router';

const router = useRouter()

const goToLogin = () => {
    router.push('/login')
}

const inputRegister = reactive<RegisterInput>({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    provider: ''
})

const isSubmitting = ref(false);

const showPassword = ref(false);
const showConfirmPassword = ref(false);

function toggleShowPassword() {
    showPassword.value = !showPassword.value;
}

function toggleShowConfirmPassword() {
    showConfirmPassword.value = !showConfirmPassword.value;
}

const { mutate } = useMutation({
    mutationFn: async (input: RegisterInput) => {
        input.provider = 'auth_internal'
        const { data } = await authService.registerApi(input)
        return data
    },
    onError: async (error: AxiosError<ErrorResponseRegister>) => {
        const { response } = error
        const message = response?.data.message
        toast.error(message || 'something went wrong')
    },
    onSuccess: async (data: SuccessResponseRegister) => {
        const { message } = data
        toast.success(message)
        inputRegister.username = ''
        inputRegister.email = ''
        inputRegister.password = ''
        inputRegister.confirm_password = ''
        inputRegister.provider = ''
        goToLogin()
    },
})

const onSubmit = () => {
    if (isSubmitting.value) return;

    isSubmitting.value = true;
    mutate({ ...inputRegister })
    isSubmitting.value = false;
}
</script>

<template>
    <main
        class="min-h-screen w-full bg-linear-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-10">
        <div class="w-full max-w-md">
            <form class="bg-white rounded-2xl ring-1 ring-black/5 p-6 sm:p-8 space-y-6" autocomplete="on"
                @submit.prevent="onSubmit">
                <header class="text-center space-y-2">
                    <h1 class="text-2xl font-bold tracking-tight text-slate-900">
                        Create your account
                    </h1>

                    <p class="text-sm text-slate-500">
                        Sign up to get started
                    </p>
                </header>

                <section class="space-y-4">
                    <div class="space-y-2">
                        <Label class="ps-1 text-slate-700" for="email">Email</Label>
                        <div class="relative">
                            <AiOutlineMail
                                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input id="email" name="email" type="email" inputmode="email" autocomplete="email"
                                placeholder="name@example.com" class="w-full pl-10" v-model="inputRegister.email" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label class="ps-1 text-slate-700" for="username">Username</Label>
                        <div class="relative">
                            <AiOutlineUser
                                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input id="username" name="username" type="text" autocomplete="username"
                                placeholder="Enter your username" class="w-full pl-10"
                                v-model="inputRegister.username" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label class="ps-1 text-slate-700" for="password">Password</Label>
                        <div class="relative">
                            <BxSolidLockAlt
                                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                            <Input id="password" name="password" :type="showPassword ? 'text' : 'password'"
                                autocomplete="new-password" placeholder="Create a password" class="w-full pl-10 pr-10"
                                v-model="inputRegister.password" />

                            <button type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                @click="toggleShowPassword" aria-label="Toggle password visibility"
                                :aria-pressed="showPassword">
                                <AiOutlineEye v-if="showPassword" class="w-5 h-5" />
                                <CiEyeOff v-else class="w-5 h-5" />
                            </button>
                        </div>

                        <p class="text-xs text-slate-500 ps-1">
                            Use at least 8 characters with a mix of letters and numbers.
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label class="ps-1 text-slate-700" for="confirmPassword">Confirm Password</Label>
                        <div class="relative">
                            <BxSolidLockAlt
                                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                            <Input id="confirmPassword" name="confirmPassword"
                                :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password"
                                placeholder="Confirm your password" class="w-full pl-10 pr-10"
                                v-model="inputRegister.confirm_password" />

                            <button type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                @click="toggleShowConfirmPassword" aria-label="Toggle confirm password visibility"
                                :aria-pressed="showConfirmPassword">
                                <AiOutlineEye v-if="showConfirmPassword" class="w-5 h-5" />
                                <CiEyeOff v-else class="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <Button class="w-full cursor-pointer mt-2" type="submit" :disabled="isSubmitting">
                        Sign Up
                    </Button>
                </section>

                <footer class="pt-1">
                    <p class="text-center text-sm text-slate-500">
                        Already have an account?
                        <a class="font-semibold text-slate-900 hover:underline" href="/login">
                            Sign In
                        </a>
                    </p>
                </footer>
            </form>
        </div>
    </main>
</template>


<style scoped></style>
