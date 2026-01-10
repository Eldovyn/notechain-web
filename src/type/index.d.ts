declare interface Card {
    id?: string;
    title?: string;
    content?: string;
    summary?: string;
    created_at?: ISODateString;
    updated_at?: ISODateString;
    deleted_at?: ISODateString;
    tags?: string[];
}

declare interface User {
    avatar: string;
    created_at: string;
    email: string;
    id: string;
    is_active: boolean;
    provider: string;
    role: string;
    updated_at: string;
}

declare interface Token {
    access_token: string;
    created_at: string;
}

declare interface Contoh1Contract {
    nama(): Promise<string>;
}

declare interface LoginInput {
    email: string;
    password: string;
    provider: string;
}

declare interface ErrorResponseLogin {
    message: string;
}

declare interface SuccessResponseLogin {
    message: string;
    token: Token;
    data: User;
}

declare interface RegisterInput {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    provider: string;
}

declare interface ErrorResponseRegister {
    message: string;
}

declare interface SuccessResponseRegister {
    message: string;
}

declare interface NoteInput {
    title: string;
    content: string;
}

declare interface SuccessResponseNote {
    message: string;
    data: Card;
}

declare interface ErrorResponseNote {
    message: string;
}