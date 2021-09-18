import SnooWrap from "snoowrap"
import cron from "node-cron"
import notifier from "node-notifier"
import fs from 'fs'

require("dotenv").config()

const {
  STORAGE_FILE,
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

const getLatestPosts = async () => {
  const result = await r
    .getSubreddit(R_SUBREDDIT)
    .search({ query: R_QUERY, sort: "new", time: "hour" })
  return result
}

const readFile = (filename: string, options?: {
  encoding?: null;
  flag?: string;
}) => fs.readFileSync(filename, options ?? { encoding: 'utf-8' })

const readFoundIdsFile = () => {
  const data = readFile(STORAGE_FILE)
  if (!(typeof data === 'string')) {
    console.log('error reading file')
    return
  }
  return data.split(',')
}

const writeFile = (filename: string, content: string) => fs.writeFileSync(filename, content)

const notifyNewLinks = async () => {
  const posts = await getLatestPosts()
  const prevIds = readFoundIdsFile()
  const newPosts = posts.filter(p => !prevIds.includes(p.id))

  console.log('')

  if (!newPosts.length) {
    console.log("no new posts")
    return
  }

  newPosts.forEach(({ permalink }) => {
    notifier.notify(permalink)
    console.log(permalink)
  })


  twilio.messages
    .create({
      body: `REDDIT POST ALERT:
  -${newPosts.map(p => p.permalink).join(`
  -`)}
  `,
      from: TWILIO_PHONE,
      to: PHONE_TO,
    })
    .then((message) => console.log(message.sid))

  writeFile(STORAGE_FILE, [...prevIds, ...newPosts.map(p => p.id)].join(','))
}

// every minute
cron.schedule("* * * * *", notifyNewLinks)

// check once right away
notifyNewLinks()
