const request = require('request');
 
const postToSlack = (url: string) => {
  request.post({
    uri: "https://hooks.slack.com/services/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",
    headers: { 'Content-type': 'application/json' },
    json: { 'text': url }
  });
}

export {
  postToSlack
};
