import { getCurrentInstance } from 'vue'

export function useCookies() {
    const inst = getCurrentInstance()
    if (!inst) {
        throw new Error('useCookies must be called in setup()')
    }

    const cookies = inst.appContext.config.globalProperties.$cookies as {
        set: (k: string, v: any, expires?: string | number) => void
        get: (k: string) => any
        remove: (k: string) => void
    }

    if (!cookies || typeof cookies.set !== 'function') {
        throw new Error('$cookies is not properly configured')
    }

    return cookies
}