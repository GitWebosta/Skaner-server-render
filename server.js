const express = require('express');
const app = express();
const path = require('path')
const { port } = require('./config');
const bodyParser = require('body-parser');
const mime = require('mime')
const cors = require('cors')
const puppeteer = require('puppeteer')

// fix cors
app.use(cors())

app.use(express.static(path.join(__dirname, './')));

// headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // Dostosuj '*', aby zezwalać tylko na konkretne domeny
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader("Content-Type", "application/json");
  next();
});

// disabled buffor
app.disable('etag');

// mime
mime.define({
  'application/json': ['json']
}, { force: true })

// pasery
//Content-type: application/json
app.use(bodyParser.json())

function scrollToBottom({
  page,
  distancePx,
  speedMs,
  scrollTimeoutMs,
  eltToScroll,
}) {
  return page.evaluate(
    (distancePx, speedMs, scrollTimeoutMs, eltToScroll) => {
      return new Promise((resolve) => {
        const elt = document.querySelector(eltToScroll);
        let totalHeight = 0;
        const timer = setInterval(() => {
          const scrollHeight = elt.scrollHeight;
          window.scrollBy(0, distancePx);
          totalHeight += distancePx;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, speedMs);

        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, scrollTimeoutMs);
      });
    },
    distancePx,
    speedMs,
    scrollTimeoutMs,
    eltToScroll
  );
}
 

const scrollAndGetPageHTML = async (req, res) => {
  // Set up Chromium browser and page.
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  try{
    const page = await browser.newPage();

    //default timeout to navigation-related function(goBack(), goForward(), goto(), reload(), setContent(), waitForNavigation())
    page.setDefaultNavigationTimeout(0);
    // //default timeout tto navigation function and waiting function(waitFor(), waitForFunction(), waitForRequest(), waitForResponse(), waitForSelector(), waitForXPath())
    page.setDefaultTimeout(0); 
    // Navigate to the example page.
    await page.goto(req.body.url);
  
    await scrollToBottom({
      page,
      distancePx: 200,
      speedMs: 50,
      scrollTimeoutMs: 10000,
      eltToScroll: "body" 
    })

    const html = await page.content();
    res.send(html);
  } catch (error){
    console.error(error);
    res.send(`Something went wrong! Error: ${error}`);
  } finally {
    await browser.close();
  }
};

app.post('/htmlCode', scrollAndGetPageHTML);


// server
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
  