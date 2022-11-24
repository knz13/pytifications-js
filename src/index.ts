
import axios from 'axios';
import { sha256 } from 'js-sha256'
import {argv} from 'node:process'



export const pytifications = {
    _login:null,
    _password:null,
    _logged_in:false,
    _registered_callbacks:{},
    _funcs_to_execute:[],
    _last_message_id:null,
    _interval:null,

    /**
     * Logs in to the pytifications network
     *
     * @param {string} login The login created at the bot.
     * @param {string} password The password created at the bot.
     * @return {boolean} If the login was successful.
     */
    async login(login:string,password:string){

        pytifications._login = login;
        pytifications._password = password;

        var res = await axios.post('https://pytifications.herokuapp.com/initialize_script',JSON.stringify({
            username:login,
            password_hash:sha256(password),
            script_name:process.argv[1]
        }),)

        pytifications._interval = setInterval(
            pytifications._check_if_any_callbacks_to_be_called,1000
        )

        if(res.status != 200){
            console.log(`could not login... reason: ${await res.data}`);
            return false;
        }
        else {
            console.log(`success logging in to pytifications`);
            pytifications._logged_in = true;
        }
        return true;

    },
    /**
     * Pushes a function to end the pytifications service, logging out
     * 
     */
    terminate(){
        pytifications._funcs_to_execute.push(
            {
                function:(obj) => {
                    if(pytifications._interval != null){
                        clearInterval(pytifications._interval)
                    }
                    pytifications._logged_in = false
                },
                args:''
            }
        )
    },

    /**
     * Checks if logged in
     */
    am_i_logged_in() {
        return pytifications._logged_in
    },

    _check_if_any_callbacks_to_be_called(){
        if(! pytifications._logged_in){
            return;
        }   
        axios.get('https://pytifications.herokuapp.com/get_callbacks',{data:JSON.stringify({
            username:pytifications._login,
            password_hash:sha256(pytifications._password),
            script_name:process.argv[1]
        })},).then(res => {
            if(res.status == 200){
                var json = res.data;
                for(const item of json){
                    pytifications._registered_callbacks[item]()
                }
            }
        }).catch(err => {
            if(err.response.status != 404){
                console.log(`error when checking for callbacks: ${err.response}`)
            }
        })

        
        for(const todo of pytifications._funcs_to_execute){
            
            todo.function(todo.args)
        }
        pytifications._funcs_to_execute = []

    },

    /**
     * Pushes a message into the queue to be sent through telegram
     * 
     * @param {string} message The message to be sent
     * @param {Array<Array<{text:string,callback:Function}>>} buttons An array of arrays corresponding to the columns and rows of buttons in the message, with callbacks
     */
    send_message(message:string,buttons: Array<Array<{text:string,callback:Function}>> = []){
        console.log(buttons)
        pytifications._funcs_to_execute.push({function:pytifications._send_message,args:{message:message,buttons:buttons}})
    },

    /**
     * Pushes a message into the queue to substitute the last sent message, if any available
     * 
     * @param {string} message The message to be sent
     * @param {Array<Array<{text:string,callback:Function}>>} buttons An array of arrays corresponding to the columns and rows of buttons in the message, with callbacks
     */
    edit_last_message(message:string,buttons: Array<Array<{text:string,callback:Function}>> = []){
        pytifications._funcs_to_execute.push({function:pytifications._edit_last_message,args:{message:message,buttons:buttons}})
    },


    async _send_message(obj){

        var message = obj.message
        var buttons = obj.buttons
        if(!pytifications._check_login()){
            return false;
        }

        var requestedButtons = []
        for(const row of buttons){
            var rowButtons = []
            for(const column of row){
                pytifications._registered_callbacks[column.callback.name] = column.callback
                rowButtons.push({
                    callback_name:column.callback.name,
                    text:column.text
                })
            }
            requestedButtons.push(rowButtons)
        }
        
        const res = await axios.post('https://pytifications.herokuapp.com/send_message',JSON.stringify({
            username:pytifications._login,
            password_hash:sha256(pytifications._password),
            message:`Message sent from js script:\n${process.argv[1]}...\n\n${message}`,
            buttons:requestedButtons
        }))

        if(res.status != 200){
            console.log(`could not send message... reason: ${await res.data}`);
            return false;
        }
        pytifications._last_message_id = await res.data

        console.log(`sent message: "${message}"`)

        return true;
    },

    async _edit_last_message(obj){
        var message = obj.message
        var buttons = obj.buttons
        
        if(!pytifications._check_login() || pytifications._last_message_id == null){
            return false;
        }


        var requestedButtons = []
        for(const row of buttons){
            var rowButtons = []
            for(const column of row){
                pytifications._registered_callbacks[column.callback.name] = column.callback
                rowButtons.push({
                    callback_name:column.callback.name,
                    text:column.text
                })
            }
            requestedButtons.push(rowButtons)
        }

        const res = await axios.patch('https://pytifications.herokuapp.com/edit_message',JSON.stringify({
            username:pytifications._login,
            password_hash:sha256(pytifications._password),
            message:`Message sent from js script:\n${process.argv[1]}...\n\n${message}`,
            message_id:pytifications._last_message_id,
            buttons:requestedButtons
        }))

        if(res.status != 200){
            console.log(`could not edit message... reason: ${await res.data}`);
            return false;
        }

        return true;
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