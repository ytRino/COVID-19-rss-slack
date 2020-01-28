import * as functions from "firebase-functions";
import * as rss from "./rss";
import * as admin from "firebase-admin";
import * as rssItem from "./Constant/rssItem";

admin.initializeApp();

exports.fetchData = functions.pubsub
    .schedule("every 12 hours")
    .onRun(async context => {
        await rss.fetchColumn(rssItem.cnet[0], rssItem.cnet[1]);
        await rss.fetchColumn(rssItem.cnn[0], rssItem.cnn[1]);
        await rss.fetchColumn(rssItem.gigazine[0], rssItem.gigazine[1]);
        await rss.fetchColumn(rssItem.hatena[0], rssItem.hatena[1]);
        await rss.fetchColumn(rssItem.huffpost[0], rssItem.huffpost[1]);
        await rss.fetchColumn(rssItem.lifehacker[0], rssItem.lifehacker[1]);
        await rss.fetchColumn(rssItem.netlab[0], rssItem.netlab[1]);
        await rss.fetchColumn(rssItem.techCrunch[0], rssItem.techCrunch[1]);
        await rss.fetchColumn(rssItem.toyoKeizai[0], rssItem.toyoKeizai[1]);
        await rss.fetchColumn(rssItem.wired[0], rssItem.wired[1]);

        // intを返さないと警告が出る https://qiita.com/bathtimefish/items/2ffc5ab6c6db8e59eb66
        return 0
    });
