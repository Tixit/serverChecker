
`serverChecker`
=====

A module that notifies a list of email addresses when an http or https address becomes reachable. Has some configuration for notification backoff.

Example
=======

```javascript
var Fiber = require("fibers") // requires node fibers
var serverChecker = require("serverChecker")

var checker = serverChecker({
    host:'tixit.me', port:443,
    errorRecipients: [
        'error@gmail.rom':{maxConsecutive:3, cooldown:10, minAttempts: 5},
        '12345678910@tmomail.net':{maxConsecutive:1, cooldown:8*60, minAttempts: 2*60}
    ],
    errorSubject: "Application unreachable", name: "the application",
    smtpTransportOptions: {
        host:'smtp.gmail.com', port:465, secure:true, requireTLS:true, auth: {user:'shunk@gmail.me', pass:'myUncrackablePassword'}
    },
    onError:function(e) {
        console.error(e.stack)
    }
})

// check once per minute
setInterval(function() {
    Fiber(function() {
        checker.check()
    }).run()
}, 60*1000)
```

This will output something like this when the server becomes unreachable for 3 minutes:

Subject: Application unreachable
2016-10-05 00:30:40 PST, tries: 3
Couldn't reach the application at tixit.me:443 during the last 3 tries. Got status code 500

Once it can again reach the server, it'll inform those emails that the problem has been resolved:

Subject: RESOLVED!! : ) Application unreachable
Reached the application at tixit.me:443 at 2016-10-05 00:35:40 PST after 18 tries!

Install
=======

```
npm install https://github.com/Tixit/serverChecker/archive/04c9a932e699dad1f016e51bf096b02e83c30b8a.tar.gz
```

Usage
=====

Accessing serverChecker:
```javascript
// node.js
var serverChecker = require("serverChecker")
```

Using serverChecker:

**`var checker = serverChecker(options)`** - Creates the checker object, with the options:

```
// args - An object with the following properties:
    // host
    // port
    // path - The path to ping the server with (default: '/')
    // secure - If true, will use https
    // errorSubject - The subject for the error email
    // name - The name of what's being watched
    // errorRecipients - Info about who to send notifications to. An object where the key is an email to send to and the value is an object with the properties:
        // maxConsecutive - The number of times in a row a notification will happen before it switches to notifying only some checks
        // cooldown - After maxConsecutive, a notification will happen once for every cooldown attempts
        // minAttempts - The minimum number of attempts before notifying will start for this recipient
    // smtpTransportOptions - the options to give to nodemailer.createTransport
        // assumes that auth.user is defined as the from email
    // onError(e) - A callback that's called whenever a notification couldn't be made
```

* **`checker.check()`** - Makes one check on the configured server and notifies if neccessary.

How to Contribute!
============

Anything helps:

* Creating issues (aka tickets/bugs/etc). Please feel free to use issues to report bugs, request features, and discuss changes
* Updating the documentation: ie this readme file. Be bold! Help create amazing documentation!
* Submitting pull requests.

How to submit pull requests:

1. Please create an issue and get my input before spending too much time creating a feature. Work with me to ensure your feature or addition is optimal and fits with the purpose of the project.
2. Fork the repository
3. clone your forked repo onto your machine and run `npm install` at its root
4. If you're gonna work on multiple separate things, its best to create a separate branch for each of them
5. edit!
6. If it's a code change, please add to the unit tests (at test/odiffTest.js) to verify that your change
7. When you're done, run the unit tests and ensure they all pass
8. Commit and push your changes
9. Submit a pull request: https://help.github.com/articles/creating-a-pull-request

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT
