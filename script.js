
"use strict";

// ========================================
// 1. Get HTML elements
// ========================================

const countriesContainer = document.getElementById("countries-container");
const searchInput = document.getElementById("search-input");
const regionFilter = document.getElementById("region-filter");
const themeToggle = document.getElementById("theme-toggle");

// Check that the required HTML elements exist
if (!countriesContainer || !searchInput || !regionFilter || !themeToggle) {
    throw new Error(
        "Required HTML elements are missing. Check your index.html IDs."
    );
}

// ========================================
// 2. API configuration
// ========================================

// Keep your existing API key
const API_KEY = "rc_live_eb827bbd5e804fc89341094661271a12";

const API_URL = "https://api.restcountries.com/countries/v5";

const FIELDS = [
    "names.common",
    "names.native",
    "codes.alpha_2",
    "codes.alpha_3",
    "population",
    "region",
    "subregion",
    "capitals",
    "borders",
    "languages",
    "currencies",
    "tlds"
].join(",");

// Store all countries fetched from the API
let allCountries = [];

// ========================================
// 3. Helper functions for API data
// ========================================

function getNativeName(country) {
    const nativeNames = country.names?.native;

    if (!nativeNames) {
        return "N/A";
    }

    const firstNativeName = Object.values(nativeNames)[0];

    if (typeof firstNativeName === "string") {
        return firstNativeName;
    }

    return firstNativeName?.common || "N/A";
}

function getCapitals(country) {
    if (!Array.isArray(country.capitals)) {
        return [];
    }

    return country.capitals
        .map(function (capital) {
            return typeof capital === "string"
                ? capital
                : capital?.name;
        })
        .filter(Boolean);
}

function getLanguages(country) {
    if (!country.languages) {
        return [];
    }

    if (Array.isArray(country.languages)) {
        return country.languages
            .map(function (language) {
                return typeof language === "string"
                    ? language
                    : language?.name || language?.english_name;
            })
            .filter(Boolean);
    }

    return Object.values(country.languages)
        .map(function (language) {
            return typeof language === "string"
                ? language
                : language?.name || language?.english_name;
        })
        .filter(Boolean);
}

function getCurrencies(country) {
    if (!country.currencies) {
        return [];
    }

    if (Array.isArray(country.currencies)) {
        return country.currencies
            .map(function (currency) {
                return typeof currency === "string"
                    ? currency
                    : currency?.name || currency?.code;
            })
            .filter(Boolean);
    }

    return Object.values(country.currencies)
        .map(function (currency) {
            return typeof currency === "string"
                ? currency
                : currency?.name || currency?.code;
        })
        .filter(Boolean);
}

function normalizeCountry(country) {
    const alpha2 = country.codes?.alpha_2;
    const alpha3 = country.codes?.alpha_3;

    return {
        name: {
            common: country.names?.common || "Unknown",
            nativeName: getNativeName(country)
        },

        alpha2Code: alpha2,
        cca3: alpha3,

flags: {
    png: country.names?.common === "Abkhazia"
        ? "./Flag_of_the_Republic_of_Abkhazia.svg.webp"
        : alpha2
            ? `https://flags.restcountries.com/v5/w320/${alpha2.toLowerCase()}.png`
            : ""
},
        population: Number(country.population) || 0,
        region: country.region || "N/A",
        subregion: country.subregion || "N/A",
        capital: getCapitals(country),
        borders: Array.isArray(country.borders)
            ? country.borders
            : [],
        languages: getLanguages(country),
        currencies: getCurrencies(country),
        tld: Array.isArray(country.tlds)
            ? country.tlds
            : []
    };
}

// ========================================
// 4. Fetch countries from the API
// ========================================

async function fetchCountries() {
    countriesContainer.innerHTML = "<p>Loading countries...</p>";

    try {
        const countries = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(offset),
                response_fields: FIELDS
            });

            const url = `${API_URL}?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${API_KEY}`
                }
            });

            let result;

            try {
                result = await response.json();
            } catch {
                throw new Error(
                    `The API returned an invalid response (${response.status}).`
                );
            }

            if (!response.ok) {
                const apiMessage = Array.isArray(result.errors)
                    ? result.errors
                        .map(function (error) {
                            return error.message;
                        })
                        .filter(Boolean)
                        .join(", ")
                    : result.message || response.statusText;

                throw new Error(
                    `API request failed: ${response.status} - ${apiMessage}`
                );
            }

            if (result.errors?.length) {
                throw new Error(
                    result.errors
                        .map(function (error) {
                            return error.message;
                        })
                        .join(", ")
                );
            }

            const pageCountries =
                result.data?.objects ||
                result.data?.countries ||
                (Array.isArray(result.data) ? result.data : []);

            if (!Array.isArray(pageCountries)) {
                throw new Error(
                    "The API response did not contain a country list."
                );
            }

            countries.push(...pageCountries);

            const more = result.data?.meta?.more;

            hasMore = typeof more === "boolean"
                ? more
                : pageCountries.length === limit;

            if (pageCountries.length === 0) {
                hasMore = false;
            }

            offset += limit;
        }

        if (countries.length === 0) {
            throw new Error(
                "The API returned no countries. Check the API response."
            );
        }

        allCountries = countries.map(normalizeCountry);

        displayCountries(allCountries);

        console.log(
            `Successfully loaded ${allCountries.length} countries.`
        );
    } catch (error) {
        console.error("Error loading countries:", error);

        countriesContainer.innerHTML = "";

        const errorMessage = document.createElement("p");
        errorMessage.textContent =
            `Could not load countries. ${error.message}`;

        const retryButton = document.createElement("button");
        retryButton.id = "retry-button";
        retryButton.type = "button";
        retryButton.textContent = "Try Again";

        retryButton.addEventListener("click", fetchCountries);

        countriesContainer.append(errorMessage, retryButton);
    }
}

// ========================================
// 5. Display country cards
// ========================================

function displayCountries(countries) {
    countriesContainer.innerHTML = "";

    if (countries.length === 0) {
        countriesContainer.innerHTML = "<p>No countries found.</p>";
        return;
    }

    countries.forEach(function (country) {
        const card = document.createElement("article");

        card.className = "country-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute(
            "aria-label",
            `View details for ${country.name.common}`
        );

        const flag = document.createElement("img"); 
        flag.alt = `Flag of ${country.name.common}`;

        flag.className = "country-flag";
        flag.src = country.flags.png;
        flag.alt = `Flag of ${country.name.common}`;
        flag.loading = "lazy";

        const info = document.createElement("div");
        info.className = "country-info";

        const name = document.createElement("h2");
        name.textContent = country.name.common;

        const population = document.createElement("p");
        population.innerHTML = "<strong>Population:</strong> ";
        population.appendChild(
            document.createTextNode(
                country.population.toLocaleString()
            )
        );

        const region = document.createElement("p");
        region.innerHTML = "<strong>Region:</strong> ";
        region.appendChild(
            document.createTextNode(country.region)
        );

        const capital = document.createElement("p");
        capital.innerHTML = "<strong>Capital:</strong> ";
        capital.appendChild(
            document.createTextNode(country.capital[0] || "N/A")
        );

        info.append(name, population, region, capital);
        card.append(flag, info);

        card.addEventListener("click", function () {
            displayCountryDetails(country);
        });

        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                displayCountryDetails(country);
            }
        });

        countriesContainer.appendChild(card);
    });
}

// ========================================
// 6. Search countries
// ========================================

searchInput.addEventListener("input", filterCountries);

// ========================================
// 7. Filter countries by region
// ========================================

regionFilter.addEventListener("change", filterCountries);

function filterCountries() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedRegion = regionFilter.value;

    const filteredCountries = allCountries.filter(function (country) {
        const matchesName = country.name.common
            .toLowerCase()
            .includes(searchText);

        const matchesRegion =
            selectedRegion === "" ||
            country.region === selectedRegion;

        return matchesName && matchesRegion;
    });

    displayCountries(filteredCountries);
}

// ========================================
// 8. Display country details
// ========================================

function displayCountryDetails(country) {
    countriesContainer.innerHTML = "";

    const details = document.createElement("section");
    details.className = "country-details";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.textContent = "← Back";

    backButton.addEventListener("click", filterCountries);

   const flag = document.createElement("img");
flag.className = "country-flag detail-flag";
flag.alt = `Flag of ${country.name.common}`;

flag.src = country.flags.png || "";
console.log("Abkhazia flag URL:", country.flags.png);

flag.onerror = () => {
    flag.style.display = "none";
};
    flag.alt = `Flag of ${country.name.common}`;

    const information = document.createElement("div");
    information.className = "country-info";

    const name = document.createElement("h2");
    name.textContent = country.name.common;

    information.appendChild(name);

    function addDetail(label, value) {
        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = `${label}: `;

        paragraph.append(
            strong,
            document.createTextNode(value || "N/A")
        );

        information.appendChild(paragraph);
    }

    addDetail("Native Name", country.name.nativeName);

    addDetail(
        "Population",
        country.population.toLocaleString()
    );

    addDetail("Region", country.region);
    addDetail("Sub Region", country.subregion);
    addDetail("Capital", country.capital.join(", "));
    addDetail("Top Level Domain", country.tld.join(", "));
    addDetail("Currencies", country.currencies.join(", "));
    addDetail("Languages", country.languages.join(", "));

    details.append(backButton, flag, information);

    // Border countries
    if (country.borders.length > 0) {
        const borderHeading = document.createElement("h3");
        borderHeading.textContent = "Border Countries:";

        const borderContainer = document.createElement("div");
        borderContainer.className = "border-countries";

        country.borders.forEach(function (borderCode) {
            const borderCountry = allCountries.find(function (item) {
                return item.cca3 === borderCode;
            });

            if (!borderCountry) {
                return;
            }

            const borderButton = document.createElement("button");
            borderButton.type = "button";
            borderButton.textContent = borderCountry.name.common;

            borderButton.addEventListener("click", function () {
                displayCountryDetails(borderCountry);
            });

            borderContainer.appendChild(borderButton);
        });

        if (borderContainer.children.length > 0) {
            details.append(borderHeading, borderContainer);
        }
    }

    countriesContainer.appendChild(details);
}

// ========================================
// 9. Dark and light theme
// ========================================

themeToggle.addEventListener("click", function () {
    const darkModeEnabled =
        document.body.classList.toggle("dark-mode");

    themeToggle.textContent = darkModeEnabled
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";

    themeToggle.setAttribute(
        "aria-label",
        darkModeEnabled
            ? "Switch to light mode"
            : "Switch to dark mode"
    );
});

// ========================================
// 10. Start the application
// ========================================

fetchCountries();
