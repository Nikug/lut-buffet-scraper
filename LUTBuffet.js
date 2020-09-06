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
    const trs = $("tbody tr");

    let foods = {};
    let weeklyMenu = {};
    let menu = initMenu();
    let availability = null;
    let weekday = null;
    let text = "";

    let foodNameIterator = 0;
    for(let rowIndex = 0, rowCount = trs.length; rowIndex < rowCount; rowIndex++) {
        const tds = $("td", trs[rowIndex]);
        let category = { foods: [] };

        for(let colIndex = 0, colCount = tds.length; colIndex < colCount; colIndex++) {
            const td = tds[colIndex];
            text = $(td).text().trim();
            if(!text) break;

            if(dayNames.includes(text.toLowerCase())) {
                [weeklyMenu, weekday, menu] = handleWeekday(text, weekday, date, menu, weeklyMenu);
                break;
            }

            else if(text.includes("klo") && weekday) {
                availability = handleAvailability(text, availability);
                break;
            }

            else if(weekday && availability) {
                category = handleFoodAndPrices(text, colIndex, availability, category);
            }
        }

        if(category.foods.length > 0) {
            category.category = foodNames[foodNameIterator++];
            if(foodNameIterator >= foodNames.length) foodNameIterator = 0;

            category.special = null;
            menu.categories.push(category);
        }
    }
    [weeklyMenu, weekday, menu] = handleWeekday(text, weekday, date, menu, weeklyMenu);
    return weeklyMenu;
}

const handleWeekday = (text, weekday, date, menu, weeklyMenu) => {
        if(weekday) {
            const weekdayIndex = dayNames.indexOf(weekday);
            const key = getWeekdayDate(date, weekdayIndex);
            weeklyMenu[key] = menu;
            menu = initMenu();
        }
        weekday = text.toLowerCase();
        return [weeklyMenu, weekday, menu];
}

const handleAvailability = (text, availability) => {
    const availabilityText = text.match(/\d+.\d+\s*.\s*\d+.\d+/g);
    if(availabilityText.length > 0) {
        availability = availabilityText[0].replace(/\s/g, "");
    }
    return(availability);  
}

const handleFoodAndPrices = (text, colIndex, availability, category) => {
    category.availability = availability;
    if(colIndex === 0) {
        let food = {
            name: text.replace(/\s*[G|VL|VE|L|M|\*]+,*/g, ""),
            dietInfo: text.match(/[G|VL|VE|L|M|\*]+/g) || []
        }
        category.foods.push(food);
    }
    else {
        category[columnStructure[colIndex]] = `${text}€`;
    }
    return category;
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
