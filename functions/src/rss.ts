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
    // console.log(`Skip: already added ${articleData.title} ${articleData.url}`)
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

  // キーワードを含むエントリを絞り込む
  if (feed && feed.items) {
    feed.items.forEach(item => {
      for(const k of keywords) {
        if (item && item.contentSnippet && item.contentSnippet.includes(k)) {
          items.push(item)
          break
        }
      }
    });

    console.log(`${rssName}: Fetched: ${items.length} of ${feed.items.length} are matched.`)
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
    console.log(`${rssName}: latest saved item date: ${latestDate.toString()} ${latestItem.data().title}`)
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

      // Articlesにデータを追加
      var added = await addArticle(postData)

      // 複数フィードで同じ投稿がある場合は投稿しない
      // 新しく追加したフィードなどで新着が多すぎ場合は投稿しない
      if (added && (parseInt(i) > items.length - 5)) {
        composedLog += `${i}: ${item.title} was added.\n`
        console.log(`新着[${i}]: ${item.isoDate || "--"} ${item.title} ${item.link}, added:${added}`)
        // Why UTC+9 does not included even though firebase shows it with UTC+9?
        const formatDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours() + 9}:${date.getMinutes()}`
        postToSlack(`(${formatDate}) ${item.title}\n${item.link}`)
      } else {
        composedLog += `${i}: ${item.title} was added but not posted to slack.\n`
      }
    } else {
      composedLog += `${i}: ${item.title} was not added.\n`
    }
  }
  console.log(composedLog)
};

export { fetchColumn };
