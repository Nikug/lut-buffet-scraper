const fetch = require("node-fetch");
const cheerio = require("cheerio");

const lutBuffetUrl = "http://www.kampusravintolat.fi/fi/lutbuffet";

const main = async () => {
    const body = await fetchSite(lutBuffetUrl);

    if(body) {
        parseBody(body);
    }
    else {
        console.log("Fetch failed, missing body");
    }
}

const fetchSite = async (url) => {
    const res = await fetch(url);
    if(res.status !== 200) return null;

    const body = await res.text();
    return body;
}

const parseBody = (body) => {
    const $ = cheerio.load(body);
    let foods = {};
    const tds = $("tbody td");
    
    for(let i = 0, count = tds.length; i < count; i++) {
        const td = tds[i];
        const text = $(td).text().trim();
        if(text) {
            console.log(text);
        }
        else {
            //console.log("empty");
        }
    }
}

main();