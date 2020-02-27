import admin = require("firebase-admin");
import rssParser = require("rss-parser");
import { postToSlack } from "./postToSlack";
import { keywords } from "./Constant/keywords";

/**
 * パースしたアイテムをfirestoreで保存するデータに変換
 * @param parsedItem パースしたアイテム
 */
const postToFireStoreData = (parsedItem: rssParser.Item): Article => {

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
  } as Article;
};

interface Article {
  title: string,
  summary: string,
  url: string,
  date: Date,
  imgUrl: string,
  category: string
}

const addArticle = async (articleData: Article) => {
  const itemsRef = admin.firestore().collection("Articles");

  const found = await itemsRef
    .where("url", "==", (articleData as Article).url)
    .limit(1)
    .get()
    .catch((error: Error) => {
      console.log("エラー アイテム検索 ", error)
    });

  if (found && !found.empty && found.docs[0].data().summary == articleData.summary) {
    console.log(`No update for ${articleData.title} ${articleData.url}`)
    return false
  }
  //console.log("@@@" + (found ? found.constructor.name : "nop"))

  await itemsRef.add(articleData).catch((error) => {
    console.error("エラー Article書き込み：", error);
  })
  return true
};

const fetchColumn = async (rssName: string, urlString: string) => {
  const items: rssParser.Item[] = [];

  const parser = new rssParser();
  const feed = await parser.parseURL(urlString);

  var listLog = ""
  // キーワードを含むエントリを絞り込む
  if (feed && feed.items) {
    feed.items.forEach(item => {
      listLog += `entry: ${item.title}`
      for(const k of keywords) {
        if (item && item.contentSnippet && item.contentSnippet.includes(k)) {
          items.push(item)
          listLog += ` [matched]`
          break
        }
      }
      listLog += `\n`
    });

    console.log("Fetched: " + items.length + " of " + feed.items.length + " are matched.")
    console.log(listLog)
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

  const latestItem = querySnapShot ? querySnapShot.docs[0] : null
  const latestDate = latestItem ? latestItem.data().date.toDate() : null;

  if (latestItem && latestDate) {
    console.log(`${rssName}: latest date: ${latestDate.toString()} ${latestItem.data().title}`)
  }

  var composedLog = ""
  for (const i in items.reverse()){
    const item = items[i];
    const postData = postToFireStoreData(item);
    const date = (postData as Article).date
    if (latestDate === null || latestDate.getTime() < date.getTime()) {
      // Rss/{category}/Items に追加
      await itemsRef
        .add(postData)
        .catch(error => {
          console.log("エラー Document書き込み: ", error);
        });

      composedLog += `${i}: add: ${item.title}\n`
      // Articlesにデータを追加
      var added = await addArticle(postData)

      console.log(`新着[${i}]: ${item.isoDate || "--"} ${item.title} ${item.link}, added:${added}`)

      // Why UTC+9 does not included even though firebase shows it with UTC+9?
      const formatDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours() + 9}:${date.getMinutes()}`
      postToSlack(`(${formatDate}) ${item.title}\n${item.link}`)
    } else {
      composedLog += `${i}: Article ${item.title} was not added.\n`
    }
  }
  console.log(composedLog)
};

export { fetchColumn };
