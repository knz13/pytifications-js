# pytifications-js
 A javascript library to send logs to telegram

 Was created as a js alternative to the [pytifications](https://pypi.org/project/pytifications/) library in python

 ## Usage

 In order to use the library, you'll first need to create an account at the [Pytificator bot]().

 After that simply install from npm with

    npm install pytifications-js

And use it!

    const Pytifications = require('pytifications-js')

    Pytifications.login('username_created_at_bot','_password_created_at_bot')

    Pytifications.send_message("hi! i'm a message!")

    //you can also send messages with buttons


    Pytifications.terminate()

    