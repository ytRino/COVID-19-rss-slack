import * as functions from "firebase-functions";
import * as rss from "./rss";
import * as admin from "firebase-admin";
import { rssItems } from "./Constant/rssItem";

admin.initializeApp();

exports.fetchData = functions.pubsub
    .schedule("every 15 minutes")
    .onRun(async context => {
        for (const [name, url] of rssItems) {
          await rss.fetchColumn(name, url);
        }
        // intを返さないと警告が出る https://qiita.com/bathtimefish/items/2ffc5ab6c6db8e59eb66
        return 0
    });
