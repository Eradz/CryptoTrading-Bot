// Example using transformers.js
import { pipeline } from '@xenova/transformers';

// This will download the model the first time you run it
const sentimentClassifier = await pipeline(
  'sentiment-analysis',
  'Xenova/financial-phrasebank' // A good model for financial text
);

async function getLocalSentiment(newsHeadline) {
  const result = await sentimentClassifier(newsHeadline);
  return result;
}


const news = "SEC approves 8 spot Ethereum ETFs in landmark decision";
const sentiment = await getLocalSentiment(news);
console.log(sentiment);
// [ { label: 'positive', score: 0.98 } ]