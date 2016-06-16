// watches the application watcher and notifies if it can't be reached

var http = require('http')
var https = require('https')

var nodemailer = require('nodemailer')
var Future = require("fibers/future")
var proto = require("proto")
var moment = require("moment-timezone")

module.exports = proto(function(){

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
    this.init = function(args) {
        this.unreachableCount = 0
        this.host = args.host
        this.port = args.port
        this.path = args.path || '/'
        this.errorSubject = args.errorSubject
        this.name = args.name
        this.errorRecipients = args.errorRecipients
        this.smtpTransportOptions = args.smtpTransportOptions
        this.maxConsecutiveErrorNotifications = args.maxConsecutiveErrorNotifications
        this.backoffNotificationMod = args.backoffNotificationMod
        this.onError = args.onError

        if(args.secure) {
            this.protocol = https
        } else {
            this.protocol = http
        }
    }

    this.check = function() {
        try {
            serverReq(this.protocol, {
                host: this.host,
                port: this.port,
                path: this.path,
                method: 'GET', rejectUnauthorized:false
            }).wait()
            this.unreachableCount = 0
//            console.log(this.name+' ok!')
        } catch(e) {
            if(e.message.indexOf("ECONNREFUSED") === -1) {
                console.log(e)
            }
            this.unreachableCount++

            var recipients = []
            for(var email in this.errorRecipients) {
                var info = this.errorRecipients[email]

                //console.log("min: "+info.minAttempts+" count:"+this.unreachableCount+" countAfterMin:"+(this.unreachableCount-info.minAttempts))

                var countAfterMin = (this.unreachableCount-info.minAttempts)
                if( (info.minAttempts === undefined || this.unreachableCount >= info.minAttempts)
                  &&(countAfterMin < info.maxConsecutive || countAfterMin>0 && countAfterMin%info.cooldown === 0)
                ) {
                    recipients.push(email)
                }
            }

//            console.log("notifying about "+this.name+": "+recipients)
            if(recipients.length > 0) {
                var errorMessage = moment().tz("America/Los_Angeles").format('YYYY-MM-DD HH:mm:ss')+' PST, tries: '+this.unreachableCount+"\n"
                                   +"Couldn't reach "+this.name+' at '+this.host+":"+this.port
                                   +' during the last '+this.unreachableCount+' tries.'

//                console.log(recipients+' '+errorMessage)
                notify(this.smtpTransportOptions, recipients, this.errorSubject, errorMessage, e, this.onError)
            }
        }
    }
})

function notify(transportOptions, to, subject, message, error, onError) {
    try {
        var info = sendMail(transportOptions, 'Tixit Notifier', to, subject, message+". "+error.message, message).wait()
        if(info.rejected.length > 0) {
            onError(new Error("Failed to send to: "+info.rejected))
        }
    } catch(e) {
        onError(e)
    }
}

function serverReq(protocol, reqOptions) {
    var f = new Future
    var req = protocol.request(reqOptions, function(res) {
        if(res.statusCode === 200) {
            f.return()
        } else {
            f.throw(new Error("Got status code "+res.statusCode))
        }
    })

    req.on('error', function(e) {
        f.throw(e)
    })

    req.end()
    return f
}

// transportOptions - the options to give to nodemailer.createTransport
    // assumes that auth.user is defined as the from email
function sendMail(transportOptions, fromName, to, subject, text, html) {
    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport(transportOptions)

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: fromName+' <'+transportOptions.auth.user+'>', // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text, // plaintext body
        html: html // html body
    }

    var f = new Future()

    // send mail with defined transport object
    transporter.sendMail(mailOptions, f.resolver())
    return f
}