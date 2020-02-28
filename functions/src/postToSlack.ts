const request = require('request');

const postToSlack = (url: string) => {
  request.post({
    uri: "https://hooks.slack.com/services/xxxxxxxxxxxxxxxxxxxxxxx",
    headers: { 'Content-type': 'application/json' },
    json: { 'text': url }
  });
}

export {
  postToSlack
};
