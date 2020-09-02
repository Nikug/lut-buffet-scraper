const fetch = require("node-fetch");
const cheerio = require("cheerio");

const lutBuffetUrl = "http://www.kampusravintolat.fi/fi/lutbuffet";
const dayNames = [
    "maanantai",
    "tiistai",
    "keskiviikko",
    "torstai",
    "perjantai",
    "lauantai",
    "sunnuntai"
]
const restaurantName = "LUT Buffet";
const columnStructure = ["foodName", "studentPrice", "studentWithoutKelaPrice", "staffPrice", "price"]
// TODO: replace foodnames, localization
const foodNames = ["Kasviskeitto", "Kasvisruoka", "Halpis", "Kallis", "Kevyesti", "Kevyesti + keitto"];


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
    const trs = $("tbody tr");
    
    let menu = {
        name: restaurantName,
        categories: []
    };

    let currentDay = {};
    let foodNameIterator = 0;
    for(let row = 0, rows = trs.length; row < rows; row++) {
        const tds = $("td", trs[row]);

        let category = { foods: [] };

        for(let col = 0, cols = tds.length; col < cols; col++) {
            const td = tds[col];
            const text = $(td).text().trim();
            if(!text) break;

            if(dayNames.includes(text.toLowerCase())) {
                currentDay = { day: text };
                break;
            }


            // add time
            if(text.includes("klo") && currentDay.day) {
                const availability = text.match(/\d+.\d+\s*.\s*\d+.\d+/g);
                if(availability.length > 0) {
                    currentDay.availability = availability[0].replace(/\s/g, "");
                }
                break;
            }

            // add food and prices
            if(currentDay.day && currentDay.availability) {
                category.availability = currentDay.availability;
                if(col === 0) {
                    let food = {
                        name: text.replace(/\s*[G|VL|VE|L|M|\*]+,*/g, ""),
                        dietInfo: text.match(/[G|VL|VE|L|M|\*]+/g) || []
                    }
                    category.foods.push(food);
                }
                else {
                    category[columnStructure[col]] = text + "€";
                }
            }
        }

        if(category.foods.length > 0) {
            category.category = foodNames[foodNameIterator++];
            if(foodNameIterator >= foodNames.length) foodNameIterator = 0;

            category.special = null;
            menu.categories.push(category);
        }
    }
    console.log(JSON.stringify(menu, null, 2));
}

main();