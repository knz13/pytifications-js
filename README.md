# pytifications-js
 A javascript library to send logs to telegram

 Was created as a js alternative to the [pytifications](https://pypi.org/project/pytifications/) library in python

## Installation

Install through npm:

    npm install pytifications-js

## Usage

In order to use the library, you'll first need to create an account at the [Pytificator bot]().

After that simply install from npm and use it!

    const Pytifications = require('pytifications-js')

    Pytifications.login('username_created_at_bot','_password_created_at_bot')

    Pytifications.send_message("hi! i'm a message!")

    //you can also send messages with buttons and add callbacks!


    //creating callback
    const myCallback = () => {
        console.log('hi!!!')


        //you can also edit the last message!
        pytifications.edit_last_message("I've been edited O.o",
            [
                [
                    {
                        text:"click here to end!",
                        callback:secondCallback
                    }
                ]
            ]
        )
        
    }
    //sending the message
    pytifications.send_message('randomMessage',[
        [
            {
                text:'I am a button!',
                callback:myCallback
            }
        ]
    ])


    const secondCallback = () => {
        console.log("thank you for using pytifications :D")

        /*Do not forget to call this method when you're done, it closes the pytifications event loop in the background*/
        pytifications.terminate()
    }

