const fetch = require("node-fetch");
const cheerio = require("cheerio");

const languages = ["en", "fi"];
const dayNames = {
    "en": [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
    ],
    "fi": [
        "maanantai",
        "tiistai",
        "keskiviikko",
        "torstai",
        "perjantai",
        "lauantai",
        "sunnuntai"
    ]
}

const restaurantName = "LUT Buffet";
const columnStructure = ["foodName", "studentPrice", "studentWithoutKelaPrice", "staffPrice", "price"];
const foodNames = {
    "en" : ["Vegetarian soup", "Vegetarian dish", "First dish", "Second dish", "Snack", "Snack + soup"],
    "fi" : ["Kasviskeitto", "Kasvisruoka", "Ruoka 1", "Ruoka 2", "Kevyesti", "Kevyesti + keitto"]
}

// "Category name" :  "string to match in the food name"
const additionalFoodNames = {
    "Kasviskeitto + pannari": "ja pannaria",
    "Vegetable soup + pancake": "+ pancake"
}

const skipStrings = [
    "Our kitchen prefers to use only Finnish meat."
];

const timeString = {
    "en": "Lunch from",
    "fi": "klo"
}

exports.scrape = async (language) => {
    if(languages.indexOf(language) === -1) {
        throw `Incorrect language. Allowed languages: ${languages}`;
    }
    const body = await fetchSite(getUrl(language));

    if(body) {
        const weeklyMenu = parseBody(body, language);
        return weeklyMenu;
    }
    else {
        console.log("Fetch failed, missing body");
        return null;
    }
}

const getUrl = (language) => {
    return `http://www.kampusravintolat.fi/${language}/lutbuffet`;
}

const fetchSite = async (url) => {
    let res;
    try {
        res = await fetch(url);
    } catch(e) {
        return null;
    }
    if(res.status !== 200) return null;

    const body = await res.text();
    return body;
}

const parseBody = (body, language) => {
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
            if(!text) {
                foodNameIterator = 0;
                break;
            };
            if(skipStrings.indexOf(text) !== -1) break;

            if(dayNames[language].includes(text.toLowerCase())) {
                [weeklyMenu, weekday, menu] = handleWeekday(text, weekday, date, menu, weeklyMenu, language);
                break;
            }

            else if(text.includes(timeString[language]) && weekday) {
                availability = handleAvailability(text, availability);
                break;
            }

            else if(weekday && availability) {
                category = handleFoodAndPrices(text, colIndex, availability, category);
            }
        }

        if(category.foods.length > 0) {
            [menu, foodNameIterator] = addFood(menu, category, language, foodNameIterator);
        }
    }
    [weeklyMenu, weekday, menu] = handleWeekday(text, weekday, date, menu, weeklyMenu, language);
    return weeklyMenu;
}

const addFood = (menu, category, language, foodNameIterator) => {
    const food = matchMultipleWords(category.foods[0].name, Object.values(additionalFoodNames));
    if(food) {
        category.category = Object.keys(additionalFoodNames).find(key => additionalFoodNames[key] === food);
    } else {
        category.category = foodNames[language][foodNameIterator++];
        if(foodNameIterator >= foodNames[language].length) foodNameIterator = 0;
    }
    
    category.special = null;
    menu.categories.push(category);
    return [menu, foodNameIterator];
} 

const matchMultipleWords = (text, words) => {
    const matches = words.filter(word => text.includes(word));
    if(matches.length > 0) {
        return matches[0];
    }
    return false;
}

const handleWeekday = (text, weekday, date, menu, weeklyMenu, language) => {
        if(weekday) {
            const weekdayIndex = dayNames[language].indexOf(weekday);
            const key = getWeekdayDate(date, weekdayIndex);
            weeklyMenu[key] = menu;
            menu = initMenu();
        }
        weekday = text.toLowerCase();
        return [weeklyMenu, weekday, menu];
}

const handleAvailability = (text, availability) => {
    const availabilityText = text.match(/\d+.\d+\s*(-|to)\s*\d+.\d+/g);
    if(availabilityText.length > 0) {
        availability = availabilityText[0].replace(/(\s)/g, "").replace("to", "-");
    }
    return(availability);
}

const handleFoodAndPrices = (text, colIndex, availability, category) => {
    category.availability = availability;
    if(colIndex === 0) {
        let food = {
            name: text.replace(/\s+(G|VL|VE|L|M|\*),*/g, ""),
            dietInfo: text.match(/\s+(G|VL|VE|L|M|\*)/g) || []
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
