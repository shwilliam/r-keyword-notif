import SnooWrap from "snoowrap"
import cron from "node-cron"
import notifier from "node-notifier"

require("dotenv").config()

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE,
  R_CLIENT_ID,
  R_CLIENT_SECRET,
  R_USER,
  R_PASS,
  R_SUBREDDIT,
  R_QUERY,
  PHONE_TO,
} = process.env
const twilio = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

const r = new SnooWrap({
  userAgent: "r-keyword-notif",
  clientId: R_CLIENT_ID,
  clientSecret: R_CLIENT_SECRET,
  username: R_USER,
  password: R_PASS,
})

const getLatestLinks = async () => {
  const result = await r
    .getSubreddit(R_SUBREDDIT)
    .search({ query: R_QUERY, sort: "new", time: "hour" })
  const resultLinks = result.map((r) => r.permalink)
  return resultLinks
}

const notifyNewLinks = async () => {
  const links = await getLatestLinks()
  if (!links.length) console.log(":(")
  else {
    links.forEach((url) => {
      notifier.notify(url)
      console.log(url)
    })

    twilio.messages
      .create({
        body: `REDDIT POST ALERT:
-${links.join(`
-`)}
`,
        from: TWILIO_PHONE,
        to: PHONE_TO,
      })
      .then((message) => console.log(message.sid))
  }
}

// every minute
cron.schedule("* * * * *", notifyNewLinks)
notifyNewLinks()
