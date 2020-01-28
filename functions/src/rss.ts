import admin = require("firebase-admin");
import rssParser = require("rss-parser");
import { postToSlack } from "./postToSlack";
import { keywords } from "./Constant/keywords";

/**
 * パースしたアイテムをfirestoreで保存するデータに変換
 * @param parsedItem パースしたアイテム
 */
const postToFireStoreData = (parsedItem: rssParser.Item): {} => {

  let imageUrl = ""
  // 正規表現でsrc内のurlを取得
  if (parsedItem.content) {
    const res = parsedItem.content.match("<img.*src\s*=\s*[\"|\'](.*?)[\"|\'].*>")
    imageUrl = res ? res[1] : ""
  }

  return {
    title: parsedItem.title || "",
    summary: parsedItem.contentSnippet || "",
    url: parsedItem.link || "",
    date: parsedItem.isoDate ? new Date(parsedItem.isoDate) : "" ,
    imgUrl: imageUrl,
    category: parsedItem.categories || ""
  };
};

interface Article {
  date: Date,
  url: string
}

const addArticle = async (articleData: {}) => {
  const itemsRef = admin.firestore().collection("Articles");

  const found = await itemsRef
    .where("url", "==", (articleData as Article).url)
    .limit(1)
    .get()
    .catch((error: Error) => {
      console.log("エラー アイテム検索 ", error)
    });

  console.log("@@@" + found || "nop")

  await itemsRef.add(articleData).catch((error) => {
    console.error("エラー Article書き込み：", error);
  })
};

const fetchColumn = async (rssName: string, urlString: string) => {
  const items: rssParser.Item[] = [];

  const parser = new rssParser();
  const feed = await parser.parseURL(urlString);

  if (feed && feed.items) {
    feed.items.forEach(item => {
      for(const k of keywords) {
        if (item && item.contentSnippet && item.contentSnippet.includes(k)) {
          items.push(item)
        }
      }
    });

    console.log("Fetched: " + items.length + " of " + feed.items.length + " are matched.")
  }

  const itemsRef = admin
    .firestore()
    .collection("Rss")
    .doc(`${rssName}`)
    .collection("Items");

  const querySnapShot = await itemsRef
    .orderBy("date", "desc")
    .limit(1)
    .get()
    .catch((error: Error) => {
      console.log("エラー アイテム取得: ", error);
    });

  const latestItem: any | null = querySnapShot ? querySnapShot.docs[0] : null
  //const latestUrl = latestItem ? latestItem.data().url : "";

  for (const i in items.reverse()){
    const item = items[i];
    const postData = postToFireStoreData(item);
    const latestDate = latestItem ? (latestItem.data() as Article).date : null;
    if (latestDate === null || latestDate < (postData as Article).date) {
      await itemsRef
        .add(postData)
        .catch(error => {
          console.log("エラー Document書き込み: ", error);
        });

      // Articlesにデータを追加
      await addArticle(postData)
    
      console.log("新着: " + (item.isoDate || "--") + " " + item.title + " " + item.link)

      postToSlack(item.title + "\n" + item.link)
    }
  }
};

export { fetchColumn };
