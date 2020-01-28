import * as functions from "firebase-functions";
import * as rss from "./rss";
import * as admin from "firebase-admin";
import { feeds } from "./Constant/rssItem";

admin.initializeApp();

exports.fetchData = functions.pubsub
    .schedule("every 15 minutes")
    .onRun(async context => {
        console.log("@)
        //console.log("@@" + feeds)
        console.log("@@@")
        //for (const feed of feeds) {
        //  console.log("@@@ " + feed)
        //  await rss.fetchColumn(feed.key, feed.value);
        //}
        // intを返さないと警告が出る https://qiita.com/bathtimefish/items/2ffc5ab6c6db8e59eb66
        return 0
    });
