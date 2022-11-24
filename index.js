
import axios from 'axios';
import { sha256 } from 'js-sha256'
import {argv} from 'node:process'



const pytifications = {
    _login:null,
    _password:null,
    _logged_in:false,
    _registered_callbacks:{},
    _last_message_id:null,

    login(login,password){

        pytifications._login = login;
        pytifications._password = password;
        
        axios.post('https://pytifications.herokuapp.com/initialize_script',{
            body:JSON.stringify({
                username:login,
                password_hash:sha256(password),
                script_name:process.argv0
            }),
        }).then(async (res) => {
            if(res.status != 200){
                console.log(`could not login... reason: ${await res.text()}`);
            }
            else {
                console.log(`success logging in to pytifications`);
                pytifications._logged_in = true;
            }
        })

        pytifications._check_if_any_callbacks_to_be_called()
    },

   async  _check_if_any_callbacks_to_be_called(){
        while(true){
            if(! pytifications._logged_in){
                continue;
            }
            var res = await axios.get('https://pytifications.herokuapp.com/get_callbacks',{
            body:JSON.stringify({
                username:pytifications._login,
                password_hash:sha256(pytifications._password),
                script_name:process.argv0
            }),
            })

            if(res.status == 200){
                json = await res.json();
                for(const item in Object.keys(json)){
                    pytifications._registered_callbacks[item]()
                }
            }
        }
    },

    async send_message(message,buttons){
        if(!pytifications._check_login()){
            return false;
        }

        var requestedButtons = []
        for(const row in buttons){
            var rowButtons = []
            for(const column in row){
                pytifications._registered_callbacks[column.callback.name] = column.callback
                rowButtons.push({
                    callback_name:column.callback.name,
                    text:column.text
                })
            }
            requestedButtons.push(rowButtons)
        }
        
        const res = await axios.post('https://pytifications.herokuapp.com/send_message',{
            body:JSON.stringify({
                username:pytifications._login,
                password_hash:sha256(pytifications._password),
                message:message,
                buttons:requestedButtons
            }),
        })

        if(res.status != 200){
            console.log(`could not send message... reason: ${await res.text()}`);
            return false;
        }
        pytifications._last_message_id = await res.json()

        print(`sent message: "${message}"`)

        return true;
    },

    async edit_last_message(message,buttons){
        if(!pytifications._check_login() || pytifications._last_message_id == null){
            return false;
        }


        var requestedButtons = []
        for(const row in buttons){
            var rowButtons = []
            for(const column in row){
                pytifications._registered_callbacks[column.callback.name] = column.callback
                rowButtons.push({
                    callback_name:column.callback.name,
                    text:column.text
                })
            }
            requestedButtons.push(rowButtons)
        }

        const res = await axios.patch('https://pytifications.herokuapp.com/edit_message',{
            body:JSON.stringify({
                username:pytifications._login,
                password_hash:sha256(pytifications._password),
                message:message,
                message_id:pytifications._last_message_id,
                buttons:requestedButtons
            }),
        })

        if(res.status != 200){
            console.log(`could not edit message... reason: ${await res.text()}`);
            return false;
        }
    },



    _check_login(){
        if(! pytifications._logged_in){
            console.log('could not send pynotification, make sure you have called Pytifications.login("username","password")')
            return false;
        }
        return true;
    }
}

export default pytifications