declare const pytifications: {
    _login: any;
    _password: any;
    _logged_in: boolean;
    _registered_callbacks: {};
    _funcs_to_execute: any[];
    _last_message_id: any;
    _interval: any;
    login(login: string, password: string): Promise<boolean>;
    terminate(): void;
    am_i_logged_in(): boolean;
    _check_if_any_callbacks_to_be_called(): void;
    send_message(message: string, buttons: Array<Array<{
        text: string;
        callback: Function;
    }>>): void;
    edit_last_message(message: any, buttons: any): void;
    _send_message(obj: any): Promise<boolean>;
    _edit_last_message(obj: any): Promise<boolean>;
    _check_login(): boolean;
};
export default pytifications;
