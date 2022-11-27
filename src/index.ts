
import axios from 'axios';
import { sha256 } from 'js-sha256'
import { type } from 'node:os';
import {argv, off} from 'node:process'

interface InternalPytificationsQueuedTask {
    function: (obj:any) => Promise<any>,
    args: any,
    additional_tasks: Array<InternalPytificationsQueuedTask>,
    on_done?: (value: {valid:boolean,result:any}) => void,
    value?: number
}

class PytificationsMessage {
    _inner_object: InternalPytificationsQueuedTask
    constructor(obj: InternalPytificationsQueuedTask){
        this._inner_object = obj
    }

    /**
     * Pushes a message into the queue to substitute this message, if possible
     * 
     * @param {string} message The message to be sent
     * @param {Array<Array<{text:string,callback:Function}>>} buttons An array of arrays corresponding to the columns and rows of buttons in the message, with callbacks
     */
    edit(message:string = "", buttons:Array<Array<{text:string,callback:Function}>> = []) {
        if(this._inner_object.value){
            pytifications._edit_last_message({
                message: message,
                buttons: buttons,
                message_id: this._inner_object.value
            });
        }
        else {
            this._inner_object.additional_tasks.push({function:async (obj) => {
                if(this._inner_object.value){
                    pytifications._edit_last_message(obj)
                }
                else {
                    console.log(`Could not edit message, id was not valid!`)
                }
            
            },args:{
                message: message,
                buttons: buttons,
                message_id: this._inner_object.value
            },additional_tasks:[]})
        }
    }
}

export const pytifications = {
    _login:null,
    _password:null,
    _logged_in:false,
    _registered_callbacks:{},
    _funcs_to_execute:[] as Array<InternalPytificationsQueuedTask>,
    _last_message_id:null,
    _interval:null,
    _script_id:null,

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
            script_language:'javascript',
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
            pytifications._script_id = res.data
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
                function:async (obj) => {
                    if(pytifications._interval != null){
                        clearInterval(pytifications._interval)
                    }
                    pytifications._logged_in = false
                },
                args:'',
                additional_tasks: []
            }
        )
    },

    /**
     * Checks if logged in
     */
    am_i_logged_in() {
        return pytifications._logged_in
    },

    _execute_all_tasks(arr: Array<InternalPytificationsQueuedTask>) {
        for(const item of arr){
            item.function(item.args).then(res => {
                if(item.on_done && res){
                    item.on_done(res);
                }
                if(item.additional_tasks){
                    pytifications._execute_all_tasks(item.additional_tasks)
                }
            })
        }
    },

    _check_if_any_callbacks_to_be_called(){
        if(!pytifications._logged_in){
            return;
        }   
        axios.get('https://pytifications.herokuapp.com/get_callbacks',{data:JSON.stringify({
            username:pytifications._login,
            password_hash:sha256(pytifications._password),
            script_id:pytifications._script_id
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

        
        pytifications._execute_all_tasks(pytifications._funcs_to_execute)

        pytifications._funcs_to_execute = []

    },

    /**
     * Pushes a message into the queue to be sent through telegram
     * 
     * @param {string} message The message to be sent
     * @param {Array<Array<{text:string,callback:Function}>>} buttons An array of arrays corresponding to the columns and rows of buttons in the message, with callbacks
     * @return {}
     */
    send_message(message:string,buttons: Array<Array<{text:string,callback:Function}>> = []){
        //console.log(buttons)
        var obj = {function:pytifications._send_message,args:{message:message,buttons:buttons},on_done:null,additional_tasks:[]} as InternalPytificationsQueuedTask
        obj.on_done = (res) => {
            obj.value = res.result
        }
        pytifications._funcs_to_execute.push(obj)
        return new PytificationsMessage(obj);
    },

    /**
     * Pushes a message into the queue to substitute the last sent message, if any available
     * 
     * @param {string} message The message to be sent
     * @param {Array<Array<{text:string,callback:Function}>>} buttons An array of arrays corresponding to the columns and rows of buttons in the message, with callbacks
     */
    edit_last_message(message:string = "",buttons: Array<Array<{text:string,callback:Function}>> = []){
        pytifications._funcs_to_execute.push({function:pytifications._edit_last_message,args:{message:message,buttons:buttons},additional_tasks:[]})
    },


    async _send_message(obj){

        var message = obj.message
        var buttons = obj.buttons
        if(!pytifications._check_login()){
            return {valid: false,result: null};
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
        var valid = true;
        const res = await axios.post('https://pytifications.herokuapp.com/send_message',JSON.stringify({
            username:pytifications._login,
            password_hash:sha256(pytifications._password),
            message:message,
            buttons:requestedButtons,
            script_id:pytifications._script_id
        }))

        if(res.status != 200){
            console.log(`could not send message... reason: ${await res.data}`);
            valid = false;
        }
        pytifications._last_message_id = res.data

        console.log(`sent message: "${message}"`)

        return {valid: valid,result: res.data};
    },

    async _edit_last_message(obj){
        var message = obj.message
        var buttons = obj.buttons
        var message_id = obj.message_id
        
        if(!pytifications._check_login() || (pytifications._last_message_id == null && message_id == null)){
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

        var requestData ={
            username:pytifications._login,
            password_hash:sha256(pytifications._password),
            message_id:message_id == null? pytifications._last_message_id : message_id,
            buttons:requestedButtons,
            script_id:pytifications._script_id
        }

        if(message != ""){
            requestData["message"] = message
        }

        const res = await axios.patch('https://pytifications.herokuapp.com/edit_message',JSON.stringify(requestData))

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