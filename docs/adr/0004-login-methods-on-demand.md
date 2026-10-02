# Every login method ships, and each one stays off until configured

A user proves who they are with a password, an email OTP, a phone OTP, or Google. All four are part of the core. A method does nothing until the deployment sets the config it needs. Password needs a hash. OTP needs `@core/messaging`. Google needs a client id and secret.

A password-only core was rejected because e-dukan's phone and email OTP, and Google, would be rebuilt in every product. Making OTP or Google mandatory was rejected because a new project must boot before it has MsgPlus, Twilio, or a Google client.
