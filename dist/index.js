"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const js_sha256_1 = require("js-sha256");
const pytifications = {
    _login: null,
    _password: null,
    _logged_in: false,
    _registered_callbacks: {},
    _funcs_to_execute: [],
    _last_message_id: null,
    _interval: null,
    login(login, password) {
        return __awaiter(this, void 0, void 0, function* () {
            pytifications._login = login;
            pytifications._password = password;
            var res = yield axios_1.default.post('https://pytifications.herokuapp.com/initialize_script', JSON.stringify({
                username: login,
                password_hash: (0, js_sha256_1.sha256)(password),
                script_name: process.argv[1]
            }));
            pytifications._interval = setInterval(pytifications._check_if_any_callbacks_to_be_called, 1000);
            if (res.status != 200) {
                console.log(`could not login... reason: ${yield res.data}`);
                return false;
            }
            else {
                console.log(`success logging in to pytifications`);
                pytifications._logged_in = true;
            }
            return true;
        });
    },
    terminate() {
        pytifications._funcs_to_execute.push({
            function: (obj) => {
                if (pytifications._interval != null) {
                    clearInterval(pytifications._interval);
                }
                pytifications._logged_in = false;
            },
            args: ''
        });
    },
    am_i_logged_in() {
        return pytifications._logged_in;
    },
    _check_if_any_callbacks_to_be_called() {
        if (!pytifications._logged_in) {
            return;
        }
        axios_1.default.get('https://pytifications.herokuapp.com/get_callbacks', { data: JSON.stringify({
                username: pytifications._login,
                password_hash: (0, js_sha256_1.sha256)(pytifications._password),
                script_name: process.argv[1]
            }) }).then(res => {
            if (res.status == 200) {
                var json = res.data;
                for (const item of json) {
                    pytifications._registered_callbacks[item]();
                }
            }
        }).catch(err => {
            console.log(err);
        });
        for (const todo of pytifications._funcs_to_execute) {
            todo.function(todo.args);
        }
        pytifications._funcs_to_execute = [];
    },
    send_message(message, buttons) {
        pytifications._funcs_to_execute.push({ function: pytifications._send_message, args: { message: message, buttons: buttons } });
    },
    edit_last_message(message, buttons) {
        pytifications._funcs_to_execute.push({ function: pytifications._edit_last_message, args: { message: message, buttons: buttons } });
    },
    _send_message(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            var message = obj.message;
            var buttons = obj.buttons;
            if (!pytifications._check_login()) {
                return false;
            }
            var requestedButtons = [];
            for (const row of buttons) {
                var rowButtons = [];
                for (const column of row) {
                    pytifications._registered_callbacks[column.callback.name] = column.callback;
                    rowButtons.push({
                        callback_name: column.callback.name,
                        text: column.text
                    });
                }
                requestedButtons.push(rowButtons);
            }
            const res = yield axios_1.default.post('https://pytifications.herokuapp.com/send_message', JSON.stringify({
                username: pytifications._login,
                password_hash: (0, js_sha256_1.sha256)(pytifications._password),
                message: `Message sent from js script:\n${process.argv[1]}...\n\n${message}`,
                buttons: requestedButtons
            }));
            if (res.status != 200) {
                console.log(`could not send message... reason: ${yield res.data}`);
                return false;
            }
            pytifications._last_message_id = yield res.data;
            console.log(`sent message: "${message}"`);
            return true;
        });
    },
    _edit_last_message(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            var message = obj.message;
            var buttons = obj.buttons;
            if (!pytifications._check_login() || pytifications._last_message_id == null) {
                return false;
            }
            var requestedButtons = [];
            for (const row of buttons) {
                var rowButtons = [];
                for (const column of row) {
                    pytifications._registered_callbacks[column.callback.name] = column.callback;
                    rowButtons.push({
                        callback_name: column.callback.name,
                        text: column.text
                    });
                }
                requestedButtons.push(rowButtons);
            }
            const res = yield axios_1.default.patch('https://pytifications.herokuapp.com/edit_message', JSON.stringify({
                username: pytifications._login,
                password_hash: (0, js_sha256_1.sha256)(pytifications._password),
                message: `Message sent from js script:\n${process.argv[1]}...\n\n${message}`,
                message_id: pytifications._last_message_id,
                buttons: requestedButtons
            }));
            if (res.status != 200) {
                console.log(`could not edit message... reason: ${yield res.data}`);
                return false;
            }
            return true;
        });
    },
    _check_login() {
        if (!pytifications._logged_in) {
            console.log('could not send pynotification, make sure you have called Pytifications.login("username","password")');
            return false;
        }
        return true;
    }
};
exports.default = pytifications;
//# sourceMappingURL=index.js.map