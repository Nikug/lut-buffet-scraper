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
// TODO: Also scrape English menu
const restaurantName = "LUT Buffet";
const columnStructure = ["foodName", "studentPrice", "studentWithoutKelaPrice", "staffPrice", "price"];
const foodNames = ["Kasviskeitto", "Kasvisruoka", "Ruoka 1", "Ruoka 2", "Kevyesti", "Kevyesti + keitto"];


exports.scrape = async () => {
    const body = await fetchSite(lutBuffetUrl);

    if(body) {
        const weeklyMenu = parseBody(body);
        return weeklyMenu;
    }
    else {
        console.log("Fetch failed, missing body");
        return null;
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
    const date = getDate($);
    let foods = {};
    const trs = $("tbody tr");
    const weeklyMenu = {};
    let menu = initMenu();

    let currentDay = {};
    let foodNameIterator = 0;
    for(let row = 0, rows = trs.length; row < rows; row++) {
        const tds = $("td", trs[row]);
        let category = { foods: [] };

        for(let col = 0, cols = tds.length; col < cols; col++) {
            const td = tds[col];
            const text = $(td).text().trim();
            if(!text) break;

            // When a weekday td is passed
            if(dayNames.includes(text.toLowerCase())) {
                if(currentDay.day) {
                    const weekday = dayNames.indexOf(currentDay.day);
                    const key = getWeekdayDate(date, weekday);
                    weeklyMenu[key] = menu;
                    menu = initMenu();
                }
                currentDay = { day: text.toLowerCase() };
            }

            // Add availability
            if(text.includes("klo") && currentDay.day) {
                const availability = text.match(/\d+.\d+\s*.\s*\d+.\d+/g);
                if(availability.length > 0) {
                    currentDay.availability = availability[0].replace(/\s/g, "");
                }
                break;
            }

            // Add food and prices
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
                    category[columnStructure[col]] = `${text}€`;
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
    return weeklyMenu;
}

const initMenu = () => {
    let menu = {
        name: restaurantName,
        categories: []
    };
    return menu;
}

const getDate = ($) => {
    const dates = $(".page-header h2").text().trim();
    if(!dates) return new Date();

    const match = dates.match(/\d\d?.\d\d?.\d\d\d\d/g);
    if(!match) return new Date();

    const friday = match[0].split(".");
    const date = new Date(parseInt(friday[2]), parseInt(friday[1]) - 1, parseInt(friday[0]));
    return date;
}

const getWeekdayDate = (date, weekday) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day == 0 ? -6 : 1);
    const newDate = new Date(date);
    const weekdayDate = new Date(newDate.setDate(diff + weekday));
    return weekdayDate;
}
