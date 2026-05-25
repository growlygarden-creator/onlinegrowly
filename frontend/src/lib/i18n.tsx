import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_STORAGE_KEY = "growly.language";

export type AppLanguage = "no" | "en";
export type LanguageMode = AppLanguage | "auto";

type TranslationValues = Record<string, string | number>;
export type TranslationKey = keyof typeof translations.no;

type I18nContextValue = {
  language: AppLanguage;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  systemLanguage: AppLanguage;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const exactUiTranslations: Record<string, string> = {
  "Ditt drivhus": "Your greenhouse",
  "God morgen,": "Good morning,",
  "Her er det viktigste akkurat nå.": "Here is what matters most right now.",
  "Vær ved dyrkested": "Weather at growing location",
  "Dyrkested": "Growing location",
  "Sett opp vær": "Set up weather",
  "Gir bedre råd": "Gives better advice",
  "Neste dager": "Next days",
  "Værvindu for drivhuset": "Weather window for the greenhouse",
  "Skjul timer": "Hide hours",
  "Timesvisning": "Hourly view",
  "Forklaring av farger": "Color explanation",
  "Temperaturspenn": "Temperature range",
  "Kjøligere": "Cooler",
  "Varmere": "Warmer",
  "Drivhusverdier": "Greenhouse values",
  "Temperatur": "Temperature",
  "Lufttemperatur": "Air temperature",
  "Luftfukt": "Humidity",
  "Luftfuktighet": "Air humidity",
  "Lufttrykk": "Air pressure",
  "Jorddata": "Soil data",
  "Jord": "Soil",
  "Jordverdier": "Soil values",
  "Jordfuktighet": "Soil moisture",
  "Jordtemperatur": "Soil temperature",
  "Lys": "Light",
  "Nedbør": "Precipitation",
  "Vind": "Wind",
  "Værtype": "Weather type",
  "Tid": "Time",
  "Timesgrafen mangler data akkurat nå": "The hourly chart is missing data right now",
  "Prøv å oppdatere værprognosen litt senere.": "Try updating the weather forecast a little later.",
  "Venter på første oppdatering": "Waiting for the first update",
  "Oppdatert nylig": "Updated recently",
  "Dagens vær": "Today's weather",
  "Dagens tips": "Today's tip",
  "Kom i gang": "Get started",
  "Siste varsel": "Latest notification",
  "Ingen varsler ennå": "No notifications yet",
  "Når Growly sender noe viktig, ligger siste beskjed her på startskjermen.": "When Growly sends something important, the latest message appears here on the home screen.",
  "Se varselhistorikk": "See notification history",
  "Mine planter": "My plants",
  "Legg til første": "Add first",
  "Kalender": "Calendar",
  "Fra mai og videre": "From May onward",
  "Kartotek": "Catalog",
  "Finn plante": "Find plant",
  "Varsler": "Notifications",
  "Siste beskjeder": "Latest messages",
  "Snarveier": "Shortcuts",
  "Vekstoversikt": "Growth overview",
  "Ingen planter enda": "No plants yet",
  "Legg til den første planten din for å starte din egen dyrkeoversikt.": "Add your first plant to start your own growing overview.",
  "Legg til plante": "Add plant",
  "Lukk jordverdier": "Close soil values",
  "Lukk rapport": "Close report",
  "Lukk trend": "Close trend",
  "Lukk": "Close",
  "Rapport": "Report",
  "Historikk": "History",
  "Trend": "Trend",
  "Henter historikk": "Fetching history",
  "Ingen historikk ennå": "No history yet",
  "Kunne ikke hente historikk.": "Could not fetch history.",
  "Nå": "Now",
  "Lavest": "Lowest",
  "Høyest": "Highest",
  "Endring": "Change",
  "Optimal": "Optimal",
  "Akseptabel": "Acceptable",
  "Venter": "Waiting",
  "Mangler måling.": "Missing measurement.",
  "Mangler måling for valgt periode.": "Missing measurement for the selected period.",
  "Innenfor optimal sone": "Within optimal zone",
  "Verdien ligger der vi ønsker den.": "The value is where we want it.",
  "Akseptabelt": "Acceptable",
  "For lavt": "Too low",
  "For høyt": "Too high",
  "Dette kan påvirke planten og bør vurderes.": "This may affect the plant and should be checked.",
  "Dette er greit, men bør følges med.": "This is okay, but worth watching.",
  "Trend uten fast sone": "Trend without a fixed zone",
  "Denne verdien vurderes best sammen med plante, jordtype og gjødslingsplan.": "This value is best assessed together with the plant, soil type and feeding plan.",
  "Ingen historikk i valgt periode": "No history in the selected period",
  "Prøv en annen periode, eller vent til huben har sendt flere målinger.": "Try another period, or wait until the hub has sent more measurements.",
  "Vann rolig og sjekk jorda igjen senere.": "Water gently and check the soil again later.",
  "Klipp litt og la planten buske seg.": "Trim a little and let the plant branch out.",
  "Sjekk modning og høst det som er klart.": "Check ripeness and harvest what is ready.",
  "Hold jevn fukt og følg med på varme dager.": "Keep moisture even and watch warm days.",
  "Gi lys, jevn fukt og rolig videre vekst.": "Give light, even moisture and steady continued growth.",
  "La spirene etablere seg før store endringer.": "Let seedlings establish before making big changes.",
  "Høsteklar": "Ready to harvest",
  "Sterk vekst": "Strong growth",
  "Vokser": "Growing",
  "Etablerer seg": "Establishing",
  "Følg opp": "Follow up",
  "Trenger vann": "Needs water",
  "Jorden virker litt tørr akkurat nå.": "The soil seems a little dry right now.",
  "Litt tørr": "A little dry",
  "Alt ser fint ut for plantene dine i dag.": "Everything looks good for your plants today.",
  "Fin balanse": "Good balance",
  "Følg værvinduet": "Follow the weather window",
  "Bruk prognosen til å planlegge lufting, skygge og vanning de neste dagene.": "Use the forecast to plan ventilation, shade and watering over the next few days.",
  "Legg inn dyrkested": "Add growing location",
  "Da kan Growly bruke lokal værprognose til dyrkeråd, også uten hub.": "Then Growly can use the local weather forecast for growing advice, even without a hub.",
  "Legg inn plantene dine": "Add your plants",
  "Da kan startskjermen vurdere klimaet mot riktige plantekrav.": "Then the home screen can assess the climate against the right plant needs.",
  "Vann sonen med tørr jord": "Water the zone with dry soil",
  "Hold jevn fukt": "Keep moisture even",
  "Jordfukten ser rolig ut. Følg trend før du vanner mer.": "Soil moisture looks steady. Follow the trend before watering more.",
  "Denne uken": "This week",
  "Luft drivhuset": "Ventilate the greenhouse",
  "Sjekk bladverk": "Check foliage",
  "Se raskt over underside av blader og nye skudd mens forholdene er stabile.": "Quickly check leaf undersides and new shoots while conditions are stable.",
  "Beskytt varme planter": "Protect warmth-loving plants",
  "Kaldt": "Cold",
  "Planlegg ompotting": "Plan repotting",
  "Plan": "Plan",
  "Luft før varmen topper seg": "Ventilate before heat peaks",
  "Drivhuset bygger varme raskere enn ute-temperaturen viser.": "The greenhouse builds heat faster than the outdoor temperature suggests.",
  "Åpne litt tidlig, vann helst ved jord og bruk lett skygge på småplanter.": "Open a little early, water at soil level and use light shade for small plants.",
  "Beskytt mot kald natt": "Protect against a cold night",
  "Varme planter kan stoppe opp selv om dagene er fine.": "Warmth-loving plants can stall even when the days are nice.",
  "Flytt små potter inn mot vegg, bruk fiberduk og vent med utplanting.": "Move small pots toward a wall, use fleece and wait before planting out.",
  "Sikre luftingen": "Secure ventilation",
  "Vind kan rive i dører, luker og lette potter.": "Wind can pull at doors, vents and light pots.",
  "Luft på lesiden, fest lette planter og sjekk at lokk og brett står stødig.": "Ventilate on the sheltered side, secure light plants and check that lids and trays are stable.",
  "Se under bladene": "Look under the leaves",
  "Små skadedyr og stress vises ofte før planten ser syk ut ovenfra.": "Small pests and stress often show before the plant looks sick from above.",
  "Sjekk nye skudd, undersiden av bladene og jordoverflaten med godt lys.": "Check new shoots, leaf undersides and the soil surface in good light.",
  "Vann rolig, ikke ofte": "Water calmly, not often",
  "Jevn fukt er bedre enn små skvetter som bare treffer toppen.": "Even moisture is better than small splashes that only wet the top.",
  "Kjenn med fingeren først, og vann langsomt til rotsonen får tid til å trekke.": "Feel with your finger first, then water slowly so the root zone has time to absorb it.",
  "Rydd litt luft rundt plantene": "Create a little air around the plants",
  "God luft mellom blader senker risikoen for sopp og svakt bladverk.": "Good airflow between leaves lowers the risk of fungus and weak foliage.",
  "Fjern visne blader og la varme planter få rom rundt stammen.": "Remove wilted leaves and give warm-loving plants space around the stem.",
  "Legg inn første plante": "Add your first plant",
  "Da kan Growly gi råd som passer plantene du faktisk dyrker.": "Then Growly can give advice for the plants you actually grow.",
  "Start med én plante, så blir tips, kalender og oppfølging mer treffsikkert.": "Start with one plant, then tips, calendar and follow-up become more accurate.",
  "Ta dette først, og sjekk plantene igjen senere i dag.": "Do this first, and check the plants again later today.",
  "Bruk to minutter på en rolig sjekk før du gjør større tiltak.": "Spend two minutes on a calm check before doing anything bigger.",
  "Finn riktig plante raskt, og åpne bare detaljene når du trenger dem.": "Find the right plant quickly, and open details only when you need them.",
  "Søk i kartoteket": "Search the catalog",
  "Tomat, Sungold, chili, salat...": "Tomato, Sungold, chili, lettuce...",
  "Kategorier": "Categories",
  "Alle": "All",
  "Ingen treff": "No matches",
  "Prøv et annet søk eller velg alle kategorier.": "Try another search or choose all categories.",
  "Sort": "Cultivar",
  "Variant": "Variant",
  "Base": "Base",
  "Om planten": "About the plant",
  "Jord og vanning": "Soil and watering",
  "Surhet": "Acidity",
  "Ompotting": "Repotting",
  "Potte/bed": "Pot/bed",
  "Vanning": "Watering",
  "Bladverk": "Foliage",
  "Såguide": "Sowing guide",
  "Så": "Sow",
  "Start": "Start",
  "Videre": "Next",
  "Sesong": "Season",
  "Gartnerassistent": "Gardening assistant",
  "Chat med Growly": "Chat with Growly",
  "Lukk chat": "Close chat",
  "Velg et bilde.": "Choose an image.",
  "Bildet er for stort. Velg et under 5 MB.": "The image is too large. Choose one under 5 MB.",
  "Kunne ikke lese bildet.": "Could not read the image.",
  "Bilde klart": "Image ready",
  "plantebilde": "plant image",
  "Fjern bilde": "Remove image",
  "Fjern": "Remove",
  "Forslag klart": "Suggestion ready",
  "Sender...": "Sending...",
  "Send til Growly": "Send to Growly",
  "Ikke send": "Do not send",
  "Legg ved bilde": "Attach image",
  "Spør, diagnostiser eller gi tilbakemelding...": "Ask, diagnose or give feedback...",
  "Send": "Send",
  "Åpne Growly-chat": "Open Growly chat",
  "Plantene dine, sådatoer og neste steg gjennom sesongen.": "Your plants, sowing dates and next steps through the season.",
  "Planter": "Plants",
  "Legg til": "Add",
  "Henter plantene dine": "Fetching your plants",
  "Growly sjekker den valgte huben.": "Growly is checking the selected hub.",
  "Start med blankt drivhus": "Start with an empty greenhouse",
  "Velg en trygg startplante, så får Growly noe konkret å følge gjennom sesongen.": "Choose a safe starter plant so Growly has something concrete to follow through the season.",
  "Tidligere planteprosjekter": "Previous plant projects",
  "Ingen avsluttede prosjekter enda": "No finished projects yet",
  "Lukk plante": "Close plant",
  "Planteinfo": "Plant info",
  "Denne planten vurderes mot egne optimale soner for temperatur, fuktighet, lys og jord.": "This plant is assessed against its own optimal zones for temperature, humidity, light and soil.",
  "Planteplan": "Plant plan",
  "Ingen plan laget ennå": "No plan created yet",
  "Planen følger denne planten og ryddes bort når prosjektet avsluttes.": "The plan follows this plant and is cleaned up when the project is finished.",
  "Lag en smart plan med vanning, rydding og oppfølging for denne planten.": "Create a smart plan with watering, cleanup and follow-up for this plant.",
  "Lag smart planteplan": "Create smart plant plan",
  "Forkultivering": "Starting indoors",
  "Ikke koblet til hub enda": "Not connected to a hub yet",
  "Foreløpig følger vi sådato, planteinfo og såguide.": "For now, we follow the sowing date, plant info and sowing guide.",
  "Flytt til drivhus": "Move to greenhouse",
  "Sensor": "Sensor",
  "7-i-1 er koblet hit": "7-in-1 is connected here",
  "7-i-1-sensor": "7-in-1 sensor",
  "Jordfuktighet, temperatur, pH og næring følger denne planten.": "Soil moisture, temperature, pH and nutrients follow this plant.",
  "Ingen plante bruker 7-i-1-sensoren nå.": "No plant is using the 7-in-1 sensor right now.",
  "Koble fra 7-i-1": "Disconnect 7-in-1",
  "Bruk 7-i-1 her": "Use 7-in-1 here",
  "Avslutt planteprosjekt": "Finish plant project",
  "Avslutt prosjekt?": "Finish project?",
  "Planten fjernes fra Mine planter og lagres i historikk.": "The plant is removed from My plants and saved to history.",
  "Sesongen er over": "The season is over",
  "Flytt til historikk som fullført sesong.": "Move to history as a completed season.",
  "Dette gikk ikke helt veien": "This did not quite work out",
  "Lagre forsøket og prøv noe nytt.": "Save the attempt and try something new.",
  "Ny plante": "New plant",
  "Legg til i drivhuset": "Add to the greenhouse",
  "Søk etter plante": "Search for plant",
  "Tomat, paprika, chili, agurk...": "Tomato, pepper, chili, cucumber...",
  "Treff i plantekartoteket": "Matches in the plant catalog",
  "Anbefalt start": "Recommended start",
  "Velg den profilen som passer planten best.": "Choose the profile that best fits the plant.",
  "Start med en vanlig drivhusplante, eller søk mer presist over.": "Start with a common greenhouse plant, or search more precisely above.",
  "Henter plantekartotek": "Fetching plant catalog",
  "Laster baseplanter, varianter og sorter.": "Loading base plants, variants and cultivars.",
  "Ingen treff enda": "No matches yet",
  "Vi kan legge denne planten inn i profil-databasen senere.": "We can add this plant to the profile database later.",
  "Bytt plante": "Change plant",
  "Plante": "Plant",
  "Velg type": "Choose type",
  "Velg sort": "Choose cultivar",
  "Valgt": "Selected",
  "Sådd / plantet": "Sown / planted",
  "Plassering nå": "Current location",
  "Utenfor drivhus": "Outside greenhouse",
  "I drivhus": "In greenhouse",
  "Kortet merkes som en plante i drivhuset.": "The card is marked as a plant in the greenhouse.",
  "Kortet viser sådata og planteguide til den flyttes inn.": "The card shows sowing data and plant guide until it is moved in.",
  "Legger til...": "Adding...",
  "Smart kalender": "Smart calendar",
  "Planteplanen er klar": "The plant plan is ready",
  "Lag plan for planten?": "Create a plan for the plant?",
  "Personlig dyrkeplan": "Personal growing plan",
  "Dette ble lagt inn": "This was added",
  "Vanning, rydding rundt planten, bladkontroll, støtte/næring og en ukessjekk.": "Watering, cleanup around the plant, leaf checks, support/feeding and a weekly check.",
  "Åpne kalender": "Open calendar",
  "Ferdig": "Done",
  "Husk vann": "Remember water",
  "Rydd rundt planten": "Clean up around the plant",
  "Sjekk blad og skudd": "Check leaves and shoots",
  "Plantetilpasset oppfølging": "Plant-specific follow-up",
  "Notat til kalenderen, valgfritt": "Note for the calendar, optional",
  "F.eks. står i stor potte ved venstre dør, må sjekkes etter varme dager.": "E.g. in a large pot by the left door, needs checking after warm days.",
  "Nei, senere": "No, later",
  "Ja, lag smart plan": "Yes, create smart plan",
  "Dagens fokus": "Today's focus",
  "Så nå": "Sow now",
  "Plant/flytt nå": "Plant/move now",
  "Dato ikke satt": "Date not set",
  "I dag": "Today",
  "I morgen": "Tomorrow",
  "Sådato ikke satt": "Sowing date not set",
  "Står i drivhus": "In greenhouse",
  "Forkultiveres": "Started indoors",
  "Følg lys, varme og rotutvikling før flytting.": "Follow light, warmth and root development before moving.",
  "grønnsak": "vegetable",
  "Grønnsak": "Vegetable",
  "urt": "herb",
  "Urt": "Herb",
  "bær": "berries",
  "Bær": "Berries",
  "frukt": "fruit",
  "Frukt": "Fruit",
  "blomst": "flower",
  "Blomst": "Flower",
  "varmeelskende fruktgrønnsak": "warm-loving fruiting vegetable",
  "varmeelskende urt": "warm-loving herb",
  "varmeelskende chili": "warm-loving chili",
  "kjølig bladgrønt": "cool-season leafy green",
  "ettårig urt/blomst": "annual herb/flower",
  "middelhavsurt": "Mediterranean herb",
  "bær busk": "berry bush",
  "bær flerårig": "perennial berry",
};

const replacementUiTranslations: Array<[RegExp, string]> = [
  [/^God morgen, (.+)\. Her er det viktigste akkurat nå\.$/, "Good morning, $1. Here is what matters most right now."],
  [/^Fukt (.+) · vind (.+)$/, "Humidity $1 · wind $2"],
  [/^Fukt (.+)$/, "Humidity $1"],
  [/^vind (.+)$/, "wind $1"],
  [/^Oppdatert (.+)$/, "Updated $1"],
  [/^Sådd (.+)$/, "Sown $1"],
  [/^(\d+) dag siden$/, "$1 day ago"],
  [/^(\d+) dager siden$/, "$1 days ago"],
  [/^Dag (\d+)$/, "Day $1"],
  [/^Høsting: ~(.+)$/, "Harvest: ~$1"],
  [/^(\d+)d igjen$/, "$1d left"],
  [/^(\d+) aktive$/, "$1 active"],
  [/^(\d+) aktiv plante$/, "$1 active plant"],
  [/^(\d+) aktive planter$/, "$1 active plants"],
  [/^Se (\d+) flere planter$/, "See $1 more plants"],
  [/^Nå: (.+)$/, "Now: $1"],
  [/^Se trend for (.+)$/, "See trend for $1"],
  [/^Optimal: (.+)$/, "Optimal: $1"],
  [/^(.+) målinger · siste (.+)$/, "$1 measurements · latest $2"],
  [/^Verdien er litt lav, men fortsatt innenfor akseptabel sone\.$/, "The value is a little low, but still within the acceptable zone."],
  [/^Verdien er litt høy, men fortsatt innenfor akseptabel sone\.$/, "The value is a little high, but still within the acceptable zone."],
  [/^Verdien er utenfor referansen og bør vurderes mot planten som står i potten\.$/, "The value is outside the reference and should be checked against the plant in the pot."],
  [/^Jordfukt ligger på (.+) %\. Sjekk potter før solen står høyt\.$/, "Soil moisture is $1%. Check pots before the sun gets high."],
  [/^Luftfuktigheten er (.+) %\. Lufting senker risiko for sopp og svakt bladverk\.$/, "Air humidity is $1%. Ventilation lowers the risk of fungus and weak foliage."],
  [/^Temperaturen er (.+)°C\. Vent med agurk, tomat og paprika ute i kald jord\.$/, "The temperature is $1°C. Wait with cucumber, tomato and pepper in cold soil."],
  [/^(.+) er riktig tid for flere varme planter når nettene holder seg stabile\.$/, "$1 is the right time for more warmth-loving plants when nights stay stable."],
  [/^Bilde: (.+)$/, "Image: $1"],
  [/^Bilde klart: (.+)$/, "Image ready: $1"],
  [/^(.+) lagret i historikk$/, "$1 saved in history"],
  [/^Sensoren måler (.+)\.$/, "The sensor measures $1."],
  [/^(\d+) punkter i kalenderen$/, "$1 points in the calendar"],
  [/^(\d+) punkter er lagt i kalenderen for (.+)\.$/, "$1 points were added to the calendar for $2."],
  [/^Growly kan lage en ryddig oppfølgingsplan for (.+)\.$/, "Growly can create a tidy follow-up plan for $1."],
  [/^Base · grønnsak$/i, "Base · vegetable"],
  [/^Base · urt$/i, "Base · herb"],
  [/^Base · bær$/i, "Base · berries"],
  [/^Base · frukt$/i, "Base · fruit"],
  [/^Base · blomst$/i, "Base · flower"],
  [/^grønnsak · varmeelskende fruktgrønnsak$/i, "vegetable · warm-loving fruiting vegetable"],
  [/^grønnsak · varmeelskende chili$/i, "vegetable · warm-loving chili"],
  [/^urt · varmeelskende urt$/i, "herb · warm-loving herb"],
  [/^urt · middelhavsurt$/i, "herb · Mediterranean herb"],
  [/^blomst · ettårig urt\/blomst$/i, "flower · annual herb/flower"],
  [/^bær · bær busk$/i, "berries · berry bush"],
  [/^bær · bær flerårig$/i, "berries · perennial berry"],
  [/^frukt · klatrende frukt$/i, "fruit · climbing fruit"],
  [/^frukt · middelhavsfrukt$/i, "fruit · Mediterranean fruit"],
];

const translations = {
  no: {
    "app.loading.title": "Laster inn...",
    "app.loading.body": "Sjekker innloggingen din. Hvis backend ikke svarer, fortsetter appen straks til innlogging.",

    "nav.aria": "Hovedmeny",
    "nav.start": "Start",
    "nav.calendar": "Kalender",
    "nav.plants": "Planter",
    "nav.catalog": "Kartotek",
    "nav.catalogShort": "Kart.",
    "nav.settings": "Innst.",

    "hubSwitcher.aria": "Velg hub",
    "hubSwitcher.active": "Aktiv hub",
    "hubSwitcher.selectAria": "Velg aktiv hub",

    "auth.login.successRegistration": "Konto opprettet. Logg inn for å fortsette.",
    "auth.login.verifyEmail": "Sjekk e-posten din og bekreft kontoen før du logger inn.",
    "auth.login.signingIn": "Logger inn...",
    "auth.login.success": "Innlogging vellykket.",
    "auth.login.invalid": "Feil brukernavn eller passord.",
    "auth.login.adminWebOnly": "Admin-kontoen brukes i Growly Management på web.",
    "auth.login.emailNotVerified": "Bekreft e-postadressen din før du logger inn.",
    "auth.login.backendUnavailable": "Backend svarer ikke akkurat nå. Du kan fortsatt teste app-designet i simulatoren.",
    "auth.login.failed": "Kunne ikke logge inn.",
    "auth.login.heroTitle": "Velkommen tilbake",
    "auth.login.heroBody": "Logg inn for å åpne drivhuset ditt og se statusen på ett sted.",
    "auth.login.account": "Konto",
    "auth.login.cardBody": "Bruk kontoen din for å åpne drivhuset.",
    "auth.login.email": "E-post",
    "auth.login.password": "Passord",
    "auth.login.submit": "Logg inn",
    "auth.login.noAccount": "Har du ikke konto ennå?",
    "auth.login.createAccount": "Opprett konto",

    "auth.register.error.passwordMismatch": "Passordene er ikke like.",
    "auth.register.error.missingFullName": "Skriv inn navn.",
    "auth.register.error.fullNameTooShort": "Navnet må være minst 2 tegn.",
    "auth.register.error.missingPhone": "Skriv inn telefonnummer.",
    "auth.register.error.phoneTooShort": "Telefonnummeret virker for kort.",
    "auth.register.error.missingEmail": "Skriv inn e-postadresse.",
    "auth.register.error.invalidEmail": "Skriv inn en gyldig e-postadresse.",
    "auth.register.error.emailExists": "Denne e-postadressen er allerede i bruk.",
    "auth.register.error.passwordTooShort": "Passordet må være minst 6 tegn.",
    "auth.register.creating": "Oppretter konto...",
    "auth.register.verifyEmailFor": "Kontoen er opprettet. Sjekk e-posten {email} og bekreft kontoen før du logger inn.",
    "auth.register.created": "Konto opprettet.",
    "auth.register.verifyEmail": "Kontoen er opprettet. Sjekk e-posten din og bekreft kontoen før du logger inn.",
    "auth.register.backendUnavailable": "Backend svarer ikke akkurat nå. Registrering virker når API-et er oppe igjen.",
    "auth.register.verificationEmailFailed": "Kontoen ble opprettet, men vi klarte ikke sende bekreftelsesmail akkurat nå.",
    "auth.register.failed": "Kunne ikke opprette konto akkurat nå.",
    "auth.register.kicker": "Ny konto",
    "auth.register.heroTitle": "Kom i gang med Growly",
    "auth.register.heroBody": "Opprett kontoen din og gjør appen klar for drivhuset ditt.",
    "auth.register.cardTitle": "Ny Growly-konto",
    "auth.register.cardBody": "Fyll inn det viktigste for å komme i gang.",
    "auth.register.name": "Navn",
    "auth.register.phone": "Telefon",
    "auth.register.email": "E-post",
    "auth.register.password": "Passord",
    "auth.register.repeatPassword": "Gjenta passord",
    "auth.register.submit": "Opprett konto",
    "auth.register.submitting": "Oppretter...",
    "auth.register.hasAccount": "Har du allerede konto?",

    "settings.title": "Innstillinger",
    "settings.subtitle": "Konto, drivhus og tilkoblinger",
    "settings.enableNotificationsAria": "Aktiver varsler",
    "settings.account": "Konto",
    "settings.fullName": "Fullt navn",
    "settings.phone": "Telefon",
    "settings.email": "E-post",
    "settings.address": "Adresse",
    "settings.newPassword": "Nytt passord",
    "settings.passwordUnchanged": "La stå tomt hvis uendret",
    "settings.saveAccount": "Lagre konto",
    "settings.logout": "Logg ut",
    "settings.loggingOut": "Logger ut",
    "settings.greenhouse": "Drivhus",
    "settings.hubOn": "Hub på",
    "settings.hubOff": "Hub av",
    "settings.notPaired": "Ikke paret",
    "settings.location": "Lokasjon: {location}",
    "settings.hubId": "Hub-ID: {hubId}",
    "settings.hubCount": "{count} {label} på kontoen",
    "settings.hubSingular": "hub",
    "settings.hubPlural": "hubber",
    "settings.hub": "Hub",
    "settings.hubActiveBody": "Sensorer og hub-data er aktivert.",
    "settings.hubInactiveBody": "Growly bruker vær og manuelle data uten hub.",
    "settings.sensor": "Sensor",
    "settings.sensorAssigned": "7-i-1 måler {plant}.",
    "settings.sensorChoose": "Velg hvilken plante 7-i-1-sensoren måler.",
    "settings.sensorPairHub": "Par hub før sensor kan kobles til plante.",
    "settings.sevenInOneSensor": "7-i-1-sensor",
    "settings.diagnosticSensor": "Diagnosesensor",
    "settings.diagnosticSensorBody": "7-i-1 brukes som hub- og drivhusdiagnose, ikke som fast plantesensor.",
    "settings.diagnosticSensorValue": "Miljødiagnose for hub/drivhus",
    "settings.diagnosticSensorOff": "Av",
    "settings.diagnosticSensorSwitch": "Bruk 7-i-1 diagnose",
    "settings.diagnosticSensorActiveBody": "7-i-1 vises som diagnosekilde på dashboardet.",
    "settings.diagnosticSensorInactiveBody": "7-i-1 skjules. Jordsensorer og hub er fortsatt aktive.",
    "settings.soilSensors": "Jordsensorer",
    "settings.pairedSoilSensors": "Parede jordsensorer",
    "settings.soilSensorSlotsRemaining": "Ledige sensorplasser",
    "settings.soilPairingActive": "Pairing aktiv til",
    "settings.soilSensor": "Jordsensor",
    "settings.soilSensorPlant": "Plante for jordsensor",
    "settings.soilSensorSchedule": "Plan for jordsensor",
    "settings.soilDayStart": "Dag starter",
    "settings.soilNightStart": "Natt starter",
    "settings.soilDayInterval": "Dagtid intervall (min)",
    "settings.soilNightInterval": "Natt intervall (min)",
    "settings.soilBatteryWarning": "Batterivarsel (%)",
    "settings.soilBatteryCritical": "Kritisk batteri (%)",
    "settings.saveSoilSchedule": "Lagre sensorplan",
    "settings.saving": "Lagrer...",
    "settings.pairSoilSensor": "Pair Soil Sensor",
    "settings.pairingSoilSensor": "Starter pairing...",
    "settings.fetchingPlants": "Henter planter...",
    "settings.sensorUnassigned": "Ikke koblet til plante",
    "settings.noPlantsOnHub": "Ingen planter på huben",
    "settings.connectHub": "Koble til hub",
    "settings.connectHubBody": "Generer en kode når en Growly Hub skal kobles til denne kontoen.",
    "settings.generatePairingCode": "Generer pairing-kode",
    "settings.noActiveCode": "Ingen aktiv kode",
    "settings.validUntil": "Gyldig til {date}",
    "settings.codeReadyHint": "Koden vises her når den er klar.",
    "settings.weatherSection": "Dyrkested og vær",
    "settings.weatherActive": "Værprognose aktiv",
    "settings.setGrowingLocation": "Sett dyrkested",
    "settings.weatherActiveBody": "Lokalt vær brukes til dyrkeråd.",
    "settings.weatherInactiveBody": "Bruk telefonens posisjon eller skriv inn adresse.",
    "settings.locationConfigured": "Dyrkested er satt",
    "settings.locationNotConfigured": "Ikke satt opp",
    "settings.weatherLocation": "Dyrkested for vær",
    "settings.weatherLocationBody": "Growly lagrer posisjonen på huben og bruker den til lokal værprognose.",
    "settings.addressOrPlace": "Adresse eller sted",
    "settings.findAddress": "Finn adresse",
    "settings.searching": "Søker...",
    "settings.useMyLocation": "Bruk min posisjon",
    "settings.fetching": "Henter...",
    "settings.locationFound": "Dyrkested funnet",
    "settings.positionSelected": "Posisjon valgt",
    "settings.advancedLocation": "Avansert plassering",
    "settings.latitude": "Breddegrad",
    "settings.longitude": "Lengdegrad",
    "settings.saveGrowingLocation": "Lagre dyrkested",
    "settings.notifications": "Varsler",
    "settings.pushNotifications": "Push-varsler",
    "settings.lastNotificationHint": "Siste varsel vises på dashbordet.",
    "settings.updateNotifications": "Oppdater varsler",
    "settings.activateNotifications": "Aktiver varsler",
    "settings.disable": "Slå av",
    "settings.notificationTime": "Varslingstid",
    "settings.notificationTimeBody": "Ingen Growly-varsler sendes før kl. 10:00 eller etter solnedgang.",
    "settings.earliest": "Tidligst",
    "settings.watering": "Vanning",
    "settings.calendar": "Kalender",
    "settings.plantCheck": "Plantesjekk",
    "settings.notificationSafeWindow": "Varsler som havner etter solnedgang flyttes tidligere samme dag.",
    "settings.saveTimes": "Lagre tider",
    "settings.theme": "Tema",
    "settings.appearance": "Utseende",
    "settings.chooseTheme": "Velg tema",
    "settings.themeLight": "Dag",
    "settings.themeDark": "Natt",
    "settings.auto": "Auto",
    "settings.themeAutoSummary": "Auto følger mobilen ({mode} nå).",
    "settings.dayMode": "dagmodus",
    "settings.nightMode": "nattmodus",
    "settings.themeDarkSummary": "Growly står fast i nattmodus.",
    "settings.themeLightSummary": "Growly står fast i dagmodus.",
    "settings.language": "Språk",
    "settings.languageTitle": "Språk",
    "settings.languageSummaryAuto": "Auto følger mobilen ({language} nå).",
    "settings.languageSummaryNo": "Growly vises på norsk.",
    "settings.languageSummaryEn": "Growly is shown in English.",
    "settings.chooseLanguage": "Velg språk",
    "settings.languageNorwegian": "Norsk",
    "settings.languageEnglish": "English",
    "settings.about": "Om appen",
    "settings.version": "Versjon",
    "settings.growlyGarden": "Growly Garden",
    "settings.defaultEmail": "kunde@example.com",
    "settings.pendingPairing": "Venter på paring",
    "settings.defaultPlant": "Plante",

    "settings.status.pairHubBeforeSensor": "Par en hub før du kobler 7-i-1-sensoren til en plante.",
    "settings.status.pairHubBeforeSoilSensor": "Par en hub før du legger til jordsensor.",
    "settings.status.plantNotFound": "Fant ikke planten på denne huben.",
    "settings.status.confirmMoveSensor": "7-i-1-sensoren er koblet til {current}. Flytte den til {next}?",
    "settings.status.movingSensor": "Flytter 7-i-1-sensor...",
    "settings.status.removingSensor": "Fjerner 7-i-1-kobling...",
    "settings.status.sensorSaveFailed": "Kunne ikke lagre sensorvalg akkurat nå.",
    "settings.status.sensorMeasures": "7-i-1-sensoren måler {plant}.",
    "settings.status.sensorRemoveFailed": "Kunne ikke fjerne sensorvalg akkurat nå.",
    "settings.status.sensorUnassigned": "7-i-1-sensoren er ikke koblet til en plante.",
    "settings.status.loggingOut": "Logger ut...",
    "settings.status.creatingPairing": "Lager pairing-kode...",
    "settings.status.pairingFailed": "Kunne ikke lage kode akkurat nå.",
    "settings.status.pairingReady": "Pairing-koden er klar.",
    "settings.status.creatingSoilPairing": "Starter soil sensor pairing...",
    "settings.status.soilSensorLimitReached": "Denne huben har allerede maks {count} jordsensorer.",
    "settings.status.soilPairingFailed": "Kunne ikke starte soil sensor pairing akkurat nå.",
    "settings.status.soilPairingReady": "Soil sensor pairing er aktiv. Sett sensoren i pairing-modus nå.",
    "settings.status.assigningSoilSensor": "Kobler jordsensor til plante...",
    "settings.status.removingSoilSensor": "Fjerner plantekobling fra jordsensor...",
    "settings.status.soilSensorAssignFailed": "Kunne ikke lagre jordsensorens plantevalg akkurat nå.",
    "settings.status.soilSensorAssigned": "Jordsensoren måler {plant}.",
    "settings.status.soilSensorUnassigned": "Jordsensoren er ikke koblet til en plante.",
    "settings.status.savingSoilSchedule": "Lagrer jordsensor-plan...",
    "settings.status.soilScheduleFailed": "Kunne ikke lagre jordsensor-plan akkurat nå.",
    "settings.status.soilScheduleSaved": "Jordsensor-planen er lagret.",
    "settings.status.savingGrowingLocation": "Lagrer dyrkested...",
    "settings.status.growingLocationFailed": "Kunne ikke lagre dyrkested akkurat nå.",
    "settings.status.growingLocationSaved": "Dyrkested er lagret.",
    "settings.status.noHubPaired": "Ingen hub er paret ennå.",
    "settings.status.activatingHub": "Aktiverer hub...",
    "settings.status.deactivatingHub": "Deaktiverer hub...",
    "settings.status.hubSaveFailed": "Kunne ikke lagre hub-status akkurat nå.",
    "settings.status.hubActive": "Hub er aktiv.",
    "settings.status.hubInactive": "Hub er slått av. Growly bruker vær og manuelle data.",
    "settings.status.activatingDiagnosticSensor": "Aktiverer diagnosesensor...",
    "settings.status.deactivatingDiagnosticSensor": "Slår av diagnosesensor...",
    "settings.status.diagnosticSensorSaveFailed": "Kunne ikke lagre diagnosesensor akkurat nå.",
    "settings.status.diagnosticSensorActive": "Diagnosesensor er aktiv.",
    "settings.status.diagnosticSensorInactive": "Diagnosesensor er slått av.",
    "settings.status.savingAccount": "Lagrer konto...",
    "settings.status.accountFailed": "Kunne ikke lagre konto. Sjekk feltene og prøv igjen.",
    "settings.status.accountSaved": "Kontoen er oppdatert.",
    "settings.status.preparingNotifications": "Klargjør varsler...",
    "settings.status.notificationsEnabled": "Varsler er aktivert for vanning, kalender, vær og plantesjekk.",
    "settings.status.notificationsDenied": "Varsler er avslått i iOS. Åpne Innstillinger på telefonen for å tillate Growly-varsler.",
    "settings.status.notificationsUnsupported": "Varsler virker først i iOS-appen, ikke i nettleseren.",
    "settings.status.notificationsNotEnabled": "Varsler ble ikke aktivert ennå.",
    "settings.status.disablingNotifications": "Slår av Growly-varsler...",
    "settings.status.notificationsDisabled": "Growly-varsler er slått av.",
    "settings.status.savingNotificationTimes": "Lagrer varslingsrytme...",
    "settings.status.notificationTimesSavedUpdated": "Varslingstidene er lagret og kommende varsler er oppdatert.",
    "settings.status.notificationTimesSaved": "Varslingstidene er lagret.",
    "settings.status.enterAddress": "Skriv inn adresse eller sted først.",
    "settings.status.searchingAddress": "Søker etter dyrkested...",
    "settings.status.chooseAddress": "Velg riktig adresse under.",
    "settings.status.noAddressMatches": "Fant ingen treff. Prøv gate, nummer og kommune.",
    "settings.status.addressFound": "Adresse funnet. Husk å lagre dyrkested.",
    "settings.status.geolocationUnsupported": "Nettleseren støtter ikke posisjonshenting.",
    "settings.status.fetchingPosition": "Henter posisjon...",
    "settings.status.positionFetched": "Posisjon hentet. Husk å lagre dyrkested.",
    "settings.status.positionDenied": "Posisjon ble ikke tillatt. Gi tilgang i nettleseren eller skriv inn adresse.",
    "settings.status.positionFailed": "Kunne ikke hente posisjon akkurat nå. Prøv adressefeltet i stedet.",
    "settings.notificationSummary.granted": "Aktivert for vanning, kalender, vær og plantesjekk.",
    "settings.notificationSummary.denied": "Avslått i iOS-innstillingene.",
    "settings.notificationSummary.unsupported": "Tilgjengelig i iOS-appen.",
    "settings.notificationSummary.off": "Ikke aktivert ennå.",

    "notifications.type.watering": "Vanning",
    "notifications.type.plantCheck": "Plantesjekk",
    "notifications.type.calendar": "Kalender",
    "notifications.type.weatherFrost": "Kald natt",
    "notifications.type.weatherHeat": "Varme",
    "notifications.type.weatherWind": "Vind",
    "notifications.type.soilBattery": "Jordsensor-batteri",
    "notifications.source.received": "Mottatt",
    "notifications.source.opened": "Åpnet",
    "notifications.source.delivered": "Levert",
    "notifications.source.scheduled": "Planlagt",
    "notifications.source.saved": "Lagret",
    "notifications.time.unknown": "Ukjent tid",
    "notifications.time.today": "I dag {time}",
    "notifications.time.yesterday": "I går {time}",
    "notifications.title": "Varsler",
    "notifications.subtitle": "Siste beskjeder fra Growly og neste planlagte påminnelser.",
    "notifications.backAria": "Tilbake til start",
    "notifications.saved": "Lagret",
    "notifications.notificationSingular": "varsel",
    "notifications.notificationPlural": "varsler",
    "notifications.upcoming": "Kommende",
    "notifications.reminderSingular": "påminnelse",
    "notifications.reminderPlural": "påminnelser",
    "notifications.history": "Historikk",
    "notifications.latest": "Siste varsler",
    "notifications.clear": "Tøm",
    "notifications.loadingTitle": "Laster varsler...",
    "notifications.loadingBody": "Henter siste Growly-beskjeder.",
    "notifications.open": "Åpne",
    "notifications.emptyHistoryTitle": "Ingen varsler lagret ennå",
    "notifications.emptyHistoryBody": "Nye Growly-varsler dukker opp her etter hvert.",
    "notifications.scheduled": "Planlagt",
    "notifications.nextReminders": "Neste påminnelser",
    "notifications.emptyUpcomingTitle": "Ingen kommende påminnelser",
    "notifications.emptyUpcomingBody": "Aktiver varsler i innstillingene når du vil ha Growly-påminnelser.",
    "notifications.generated.plantFallback": "planten",
    "notifications.generated.morePlants": "{first} og {count} til",
    "notifications.generated.frostTitle": "Fare for kald natt",
    "notifications.generated.frostBody": "Laveste temperatur er meldt rundt {temperature}°C. Dekk eller flytt varme planter i tide.",
    "notifications.generated.heatTitle": "Sterk varme i vente",
    "notifications.generated.heatBody": "Det kan bli rundt {temperature}°C. Planlegg lufting, skygge og rolig vanning.",
    "notifications.generated.windTitle": "Vind å følge med på",
    "notifications.generated.windBody": "Vinden kan komme opp i {speed} m/s. Sikre lette potter og luft forsiktig.",
    "notifications.generated.wateringTitle": "Påminnelse om vanning",
    "notifications.generated.wateringBody": "Sjekk jordfukt og potter for {plants}. Vann rolig hvis jorda kjennes tørr.",
    "notifications.generated.plantCheckTitle": "Plantesjekk",
    "notifications.generated.plantCheckBody": "Se raskt over nye skudd, bladundersider og blomster. Små tegn er lettest å rette tidlig.",
    "notifications.generated.calendarTitle": "Kalender og såoppgaver",
    "notifications.generated.calendarBody": "Sjekk ukens så-, flytte- og oppfølgingsoppgaver i Growly-kalenderen.",
    "notifications.generated.soilBatteryWarningTitle": "Lavt batteri på jordsensor",
    "notifications.generated.soilBatteryWarningBody": "{sensor} har {percent}% batteri igjen. Planlegg lading/bytte snart.",
    "notifications.generated.soilBatteryCriticalTitle": "Kritisk batteri på jordsensor",
    "notifications.generated.soilBatteryCriticalBody": "{sensor} er nede på {percent}% batteri. Lad eller bytt batteri så snart du kan.",
  },
  en: {
    "app.loading.title": "Loading...",
    "app.loading.body": "Checking your sign-in. If the backend does not respond, the app will move on to sign-in shortly.",

    "nav.aria": "Main menu",
    "nav.start": "Home",
    "nav.calendar": "Calendar",
    "nav.plants": "Plants",
    "nav.catalog": "Catalog",
    "nav.catalogShort": "Cat.",
    "nav.settings": "Settings",

    "hubSwitcher.aria": "Choose hub",
    "hubSwitcher.active": "Active hub",
    "hubSwitcher.selectAria": "Choose active hub",

    "auth.login.successRegistration": "Account created. Sign in to continue.",
    "auth.login.verifyEmail": "Check your email and confirm your account before signing in.",
    "auth.login.signingIn": "Signing in...",
    "auth.login.success": "Signed in.",
    "auth.login.invalid": "Incorrect email or password.",
    "auth.login.adminWebOnly": "The admin account is used in Growly Management on the web.",
    "auth.login.emailNotVerified": "Confirm your email address before signing in.",
    "auth.login.backendUnavailable": "The backend is not responding right now. You can still test the app design in the simulator.",
    "auth.login.failed": "Could not sign in.",
    "auth.login.heroTitle": "Welcome back",
    "auth.login.heroBody": "Sign in to open your greenhouse and see everything in one place.",
    "auth.login.account": "Account",
    "auth.login.cardBody": "Use your account to open the greenhouse.",
    "auth.login.email": "Email",
    "auth.login.password": "Password",
    "auth.login.submit": "Sign in",
    "auth.login.noAccount": "Do not have an account yet?",
    "auth.login.createAccount": "Create account",

    "auth.register.error.passwordMismatch": "The passwords do not match.",
    "auth.register.error.missingFullName": "Enter your name.",
    "auth.register.error.fullNameTooShort": "The name must be at least 2 characters.",
    "auth.register.error.missingPhone": "Enter your phone number.",
    "auth.register.error.phoneTooShort": "The phone number looks too short.",
    "auth.register.error.missingEmail": "Enter your email address.",
    "auth.register.error.invalidEmail": "Enter a valid email address.",
    "auth.register.error.emailExists": "This email address is already in use.",
    "auth.register.error.passwordTooShort": "The password must be at least 6 characters.",
    "auth.register.creating": "Creating account...",
    "auth.register.verifyEmailFor": "The account was created. Check {email} and confirm the account before signing in.",
    "auth.register.created": "Account created.",
    "auth.register.verifyEmail": "The account was created. Check your email and confirm the account before signing in.",
    "auth.register.backendUnavailable": "The backend is not responding right now. Registration will work again when the API is back.",
    "auth.register.verificationEmailFailed": "The account was created, but we could not send the verification email right now.",
    "auth.register.failed": "Could not create the account right now.",
    "auth.register.kicker": "New account",
    "auth.register.heroTitle": "Get started with Growly",
    "auth.register.heroBody": "Create your account and get the app ready for your greenhouse.",
    "auth.register.cardTitle": "New Growly account",
    "auth.register.cardBody": "Add the essentials to get started.",
    "auth.register.name": "Name",
    "auth.register.phone": "Phone",
    "auth.register.email": "Email",
    "auth.register.password": "Password",
    "auth.register.repeatPassword": "Repeat password",
    "auth.register.submit": "Create account",
    "auth.register.submitting": "Creating...",
    "auth.register.hasAccount": "Already have an account?",

    "settings.title": "Settings",
    "settings.subtitle": "Account, greenhouse and connections",
    "settings.enableNotificationsAria": "Enable notifications",
    "settings.account": "Account",
    "settings.fullName": "Full name",
    "settings.phone": "Phone",
    "settings.email": "Email",
    "settings.address": "Address",
    "settings.newPassword": "New password",
    "settings.passwordUnchanged": "Leave empty if unchanged",
    "settings.saveAccount": "Save account",
    "settings.logout": "Sign out",
    "settings.loggingOut": "Signing out",
    "settings.greenhouse": "Greenhouse",
    "settings.hubOn": "Hub on",
    "settings.hubOff": "Hub off",
    "settings.notPaired": "Not paired",
    "settings.location": "Location: {location}",
    "settings.hubId": "Hub ID: {hubId}",
    "settings.hubCount": "{count} {label} on the account",
    "settings.hubSingular": "hub",
    "settings.hubPlural": "hubs",
    "settings.hub": "Hub",
    "settings.hubActiveBody": "Sensors and hub data are enabled.",
    "settings.hubInactiveBody": "Growly uses weather and manual data without the hub.",
    "settings.sensor": "Sensor",
    "settings.sensorAssigned": "7-in-1 is measuring {plant}.",
    "settings.sensorChoose": "Choose which plant the 7-in-1 sensor measures.",
    "settings.sensorPairHub": "Pair a hub before connecting the sensor to a plant.",
    "settings.sevenInOneSensor": "7-in-1 sensor",
    "settings.diagnosticSensor": "Diagnostic sensor",
    "settings.diagnosticSensorBody": "7-in-1 is used for hub and greenhouse diagnostics, not as a fixed plant sensor.",
    "settings.diagnosticSensorValue": "Environment diagnostics for hub/greenhouse",
    "settings.diagnosticSensorOff": "Off",
    "settings.diagnosticSensorSwitch": "Use 7-in-1 diagnostics",
    "settings.diagnosticSensorActiveBody": "7-in-1 is shown as a diagnostic source on the dashboard.",
    "settings.diagnosticSensorInactiveBody": "7-in-1 is hidden. Soil sensors and the hub stay active.",
    "settings.soilSensors": "Soil sensors",
    "settings.pairedSoilSensors": "Paired soil sensors",
    "settings.soilSensorSlotsRemaining": "Available sensor slots",
    "settings.soilPairingActive": "Pairing active until",
    "settings.soilSensor": "Soil sensor",
    "settings.soilSensorPlant": "Plant for soil sensor",
    "settings.soilSensorSchedule": "Soil sensor schedule",
    "settings.soilDayStart": "Day starts",
    "settings.soilNightStart": "Night starts",
    "settings.soilDayInterval": "Day interval (min)",
    "settings.soilNightInterval": "Night interval (min)",
    "settings.soilBatteryWarning": "Battery warning (%)",
    "settings.soilBatteryCritical": "Critical battery (%)",
    "settings.saveSoilSchedule": "Save sensor schedule",
    "settings.saving": "Saving...",
    "settings.pairSoilSensor": "Pair Soil Sensor",
    "settings.pairingSoilSensor": "Starting pairing...",
    "settings.fetchingPlants": "Fetching plants...",
    "settings.sensorUnassigned": "Not connected to a plant",
    "settings.noPlantsOnHub": "No plants on this hub",
    "settings.connectHub": "Connect hub",
    "settings.connectHubBody": "Generate a code when a Growly Hub should connect to this account.",
    "settings.generatePairingCode": "Generate pairing code",
    "settings.noActiveCode": "No active code",
    "settings.validUntil": "Valid until {date}",
    "settings.codeReadyHint": "The code appears here when it is ready.",
    "settings.weatherSection": "Growing location and weather",
    "settings.weatherActive": "Weather forecast active",
    "settings.setGrowingLocation": "Set growing location",
    "settings.weatherActiveBody": "Local weather is used for growing advice.",
    "settings.weatherInactiveBody": "Use the phone location or enter an address.",
    "settings.locationConfigured": "Growing location is set",
    "settings.locationNotConfigured": "Not set up",
    "settings.weatherLocation": "Growing location for weather",
    "settings.weatherLocationBody": "Growly stores the position on the hub and uses it for the local weather forecast.",
    "settings.addressOrPlace": "Address or place",
    "settings.findAddress": "Find address",
    "settings.searching": "Searching...",
    "settings.useMyLocation": "Use my location",
    "settings.fetching": "Fetching...",
    "settings.locationFound": "Growing location found",
    "settings.positionSelected": "Position selected",
    "settings.advancedLocation": "Advanced location",
    "settings.latitude": "Latitude",
    "settings.longitude": "Longitude",
    "settings.saveGrowingLocation": "Save growing location",
    "settings.notifications": "Notifications",
    "settings.pushNotifications": "Push notifications",
    "settings.lastNotificationHint": "The latest notification is shown on the dashboard.",
    "settings.updateNotifications": "Update notifications",
    "settings.activateNotifications": "Enable notifications",
    "settings.disable": "Turn off",
    "settings.notificationTime": "Notification time",
    "settings.notificationTimeBody": "No Growly notifications are sent before 10:00 or after sunset.",
    "settings.earliest": "Earliest",
    "settings.watering": "Watering",
    "settings.calendar": "Calendar",
    "settings.plantCheck": "Plant check",
    "settings.notificationSafeWindow": "Notifications that land after sunset are moved earlier the same day.",
    "settings.saveTimes": "Save times",
    "settings.theme": "Theme",
    "settings.appearance": "Appearance",
    "settings.chooseTheme": "Choose theme",
    "settings.themeLight": "Day",
    "settings.themeDark": "Night",
    "settings.auto": "Auto",
    "settings.themeAutoSummary": "Auto follows the phone ({mode} now).",
    "settings.dayMode": "day mode",
    "settings.nightMode": "night mode",
    "settings.themeDarkSummary": "Growly stays in night mode.",
    "settings.themeLightSummary": "Growly stays in day mode.",
    "settings.language": "Language",
    "settings.languageTitle": "Language",
    "settings.languageSummaryAuto": "Auto follows the phone ({language} now).",
    "settings.languageSummaryNo": "Growly is shown in Norwegian.",
    "settings.languageSummaryEn": "Growly is shown in English.",
    "settings.chooseLanguage": "Choose language",
    "settings.languageNorwegian": "Norsk",
    "settings.languageEnglish": "English",
    "settings.about": "About",
    "settings.version": "Version",
    "settings.growlyGarden": "Growly Garden",
    "settings.defaultEmail": "customer@example.com",
    "settings.pendingPairing": "Waiting for pairing",
    "settings.defaultPlant": "Plant",

    "settings.status.pairHubBeforeSensor": "Pair a hub before connecting the 7-in-1 sensor to a plant.",
    "settings.status.pairHubBeforeSoilSensor": "Pair a hub before adding a soil sensor.",
    "settings.status.plantNotFound": "Could not find the plant on this hub.",
    "settings.status.confirmMoveSensor": "The 7-in-1 sensor is connected to {current}. Move it to {next}?",
    "settings.status.movingSensor": "Moving 7-in-1 sensor...",
    "settings.status.removingSensor": "Removing 7-in-1 connection...",
    "settings.status.sensorSaveFailed": "Could not save the sensor choice right now.",
    "settings.status.sensorMeasures": "The 7-in-1 sensor is measuring {plant}.",
    "settings.status.sensorRemoveFailed": "Could not remove the sensor choice right now.",
    "settings.status.sensorUnassigned": "The 7-in-1 sensor is not connected to a plant.",
    "settings.status.loggingOut": "Signing out...",
    "settings.status.creatingPairing": "Creating pairing code...",
    "settings.status.pairingFailed": "Could not create a code right now.",
    "settings.status.pairingReady": "The pairing code is ready.",
    "settings.status.creatingSoilPairing": "Starting soil sensor pairing...",
    "settings.status.soilSensorLimitReached": "This hub already has the maximum {count} soil sensors.",
    "settings.status.soilPairingFailed": "Could not start soil sensor pairing right now.",
    "settings.status.soilPairingReady": "Soil sensor pairing is active. Put the sensor in pairing mode now.",
    "settings.status.assigningSoilSensor": "Connecting soil sensor to plant...",
    "settings.status.removingSoilSensor": "Removing soil sensor plant link...",
    "settings.status.soilSensorAssignFailed": "Could not save the soil sensor plant choice right now.",
    "settings.status.soilSensorAssigned": "The soil sensor is measuring {plant}.",
    "settings.status.soilSensorUnassigned": "The soil sensor is not connected to a plant.",
    "settings.status.savingSoilSchedule": "Saving soil sensor schedule...",
    "settings.status.soilScheduleFailed": "Could not save the soil sensor schedule right now.",
    "settings.status.soilScheduleSaved": "Soil sensor schedule saved.",
    "settings.status.savingGrowingLocation": "Saving growing location...",
    "settings.status.growingLocationFailed": "Could not save the growing location right now.",
    "settings.status.growingLocationSaved": "Growing location saved.",
    "settings.status.noHubPaired": "No hub is paired yet.",
    "settings.status.activatingHub": "Activating hub...",
    "settings.status.deactivatingHub": "Deactivating hub...",
    "settings.status.hubSaveFailed": "Could not save hub status right now.",
    "settings.status.hubActive": "Hub is active.",
    "settings.status.hubInactive": "Hub is turned off. Growly uses weather and manual data.",
    "settings.status.activatingDiagnosticSensor": "Activating diagnostic sensor...",
    "settings.status.deactivatingDiagnosticSensor": "Turning off diagnostic sensor...",
    "settings.status.diagnosticSensorSaveFailed": "Could not save diagnostic sensor right now.",
    "settings.status.diagnosticSensorActive": "Diagnostic sensor is active.",
    "settings.status.diagnosticSensorInactive": "Diagnostic sensor is turned off.",
    "settings.status.savingAccount": "Saving account...",
    "settings.status.accountFailed": "Could not save the account. Check the fields and try again.",
    "settings.status.accountSaved": "Account updated.",
    "settings.status.preparingNotifications": "Preparing notifications...",
    "settings.status.notificationsEnabled": "Notifications are enabled for watering, calendar, weather and plant checks.",
    "settings.status.notificationsDenied": "Notifications are denied in iOS. Open Settings on the phone to allow Growly notifications.",
    "settings.status.notificationsUnsupported": "Notifications work in the iOS app, not in the browser.",
    "settings.status.notificationsNotEnabled": "Notifications were not enabled yet.",
    "settings.status.disablingNotifications": "Turning off Growly notifications...",
    "settings.status.notificationsDisabled": "Growly notifications are turned off.",
    "settings.status.savingNotificationTimes": "Saving notification schedule...",
    "settings.status.notificationTimesSavedUpdated": "Notification times are saved and upcoming notifications are updated.",
    "settings.status.notificationTimesSaved": "Notification times are saved.",
    "settings.status.enterAddress": "Enter an address or place first.",
    "settings.status.searchingAddress": "Searching for growing location...",
    "settings.status.chooseAddress": "Choose the correct address below.",
    "settings.status.noAddressMatches": "No matches found. Try street, number and municipality.",
    "settings.status.addressFound": "Address found. Remember to save the growing location.",
    "settings.status.geolocationUnsupported": "The browser does not support location lookup.",
    "settings.status.fetchingPosition": "Fetching position...",
    "settings.status.positionFetched": "Position fetched. Remember to save the growing location.",
    "settings.status.positionDenied": "Location was not allowed. Grant access in the browser or enter an address.",
    "settings.status.positionFailed": "Could not fetch position right now. Try the address field instead.",
    "settings.notificationSummary.granted": "Enabled for watering, calendar, weather and plant checks.",
    "settings.notificationSummary.denied": "Denied in iOS settings.",
    "settings.notificationSummary.unsupported": "Available in the iOS app.",
    "settings.notificationSummary.off": "Not enabled yet.",

    "notifications.type.watering": "Watering",
    "notifications.type.plantCheck": "Plant check",
    "notifications.type.calendar": "Calendar",
    "notifications.type.weatherFrost": "Cold night",
    "notifications.type.weatherHeat": "Heat",
    "notifications.type.weatherWind": "Wind",
    "notifications.type.soilBattery": "Soil sensor battery",
    "notifications.source.received": "Received",
    "notifications.source.opened": "Opened",
    "notifications.source.delivered": "Delivered",
    "notifications.source.scheduled": "Scheduled",
    "notifications.source.saved": "Saved",
    "notifications.time.unknown": "Unknown time",
    "notifications.time.today": "Today {time}",
    "notifications.time.yesterday": "Yesterday {time}",
    "notifications.title": "Notifications",
    "notifications.subtitle": "Latest messages from Growly and upcoming reminders.",
    "notifications.backAria": "Back to home",
    "notifications.saved": "Saved",
    "notifications.notificationSingular": "notification",
    "notifications.notificationPlural": "notifications",
    "notifications.upcoming": "Upcoming",
    "notifications.reminderSingular": "reminder",
    "notifications.reminderPlural": "reminders",
    "notifications.history": "History",
    "notifications.latest": "Latest notifications",
    "notifications.clear": "Clear",
    "notifications.loadingTitle": "Loading notifications...",
    "notifications.loadingBody": "Fetching the latest Growly messages.",
    "notifications.open": "Open",
    "notifications.emptyHistoryTitle": "No saved notifications yet",
    "notifications.emptyHistoryBody": "New Growly notifications will appear here over time.",
    "notifications.scheduled": "Scheduled",
    "notifications.nextReminders": "Next reminders",
    "notifications.emptyUpcomingTitle": "No upcoming reminders",
    "notifications.emptyUpcomingBody": "Enable notifications in settings when you want Growly reminders.",
    "notifications.generated.plantFallback": "the plant",
    "notifications.generated.morePlants": "{first} and {count} more",
    "notifications.generated.frostTitle": "Cold night warning",
    "notifications.generated.frostBody": "The lowest temperature is forecast around {temperature}°C. Cover or move warmth-loving plants in time.",
    "notifications.generated.heatTitle": "Strong heat ahead",
    "notifications.generated.heatBody": "It may reach around {temperature}°C. Plan ventilation, shade and calm watering.",
    "notifications.generated.windTitle": "Wind to watch",
    "notifications.generated.windBody": "Wind may reach {speed} m/s. Secure light pots and ventilate carefully.",
    "notifications.generated.wateringTitle": "Watering reminder",
    "notifications.generated.wateringBody": "Check soil moisture and pots for {plants}. Water gently if the soil feels dry.",
    "notifications.generated.plantCheckTitle": "Plant check",
    "notifications.generated.plantCheckBody": "Quickly check new shoots, leaf undersides and flowers. Small signs are easiest to correct early.",
    "notifications.generated.calendarTitle": "Calendar and sowing tasks",
    "notifications.generated.calendarBody": "Check this week's sowing, moving and follow-up tasks in the Growly calendar.",
    "notifications.generated.soilBatteryWarningTitle": "Low soil sensor battery",
    "notifications.generated.soilBatteryWarningBody": "{sensor} has {percent}% battery left. Plan a charge or battery swap soon.",
    "notifications.generated.soilBatteryCriticalTitle": "Critical soil sensor battery",
    "notifications.generated.soilBatteryCriticalBody": "{sensor} is down to {percent}% battery. Charge or swap the battery as soon as you can.",
  },
} as const;

const I18nContext = createContext<I18nContextValue | null>(null);

function languageFromLocale(locale: string | undefined): AppLanguage {
  const normalized = locale?.toLowerCase() ?? "";
  return normalized.startsWith("nb") || normalized.startsWith("nn") || normalized.startsWith("no") ? "no" : "en";
}

function readSystemLanguage(): AppLanguage {
  if (typeof navigator === "undefined") {
    return "en";
  }
  return languageFromLocale(navigator.language || navigator.languages?.[0]);
}

function readStoredLanguageMode(): LanguageMode {
  if (typeof window === "undefined") {
    return "auto";
  }
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage === "no" || storedLanguage === "en" || storedLanguage === "auto" ? storedLanguage : "auto";
  } catch {
    return "auto";
  }
}

function formatTranslation(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function translateUiText(value: string, language: AppLanguage): string {
  if (language !== "en") {
    return value;
  }

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const exact = exactUiTranslations[trimmed];
  if (exact) {
    return `${leading}${exact}${trailing}`;
  }

  for (const [pattern, replacement] of replacementUiTranslations) {
    if (pattern.test(trimmed)) {
      return `${leading}${trimmed.replace(pattern, replacement)}${trailing}`;
    }
  }

  return value;
}

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) {
    return true;
  }
  return Boolean(parent.closest("script, style, textarea, input, [data-i18n-skip='true']"));
}

function translateElementText(root: ParentNode, language: AppLanguage): void {
  if (typeof document === "undefined") {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if (!shouldSkipTextNode(textNode)) {
      const translated = translateUiText(textNode.nodeValue ?? "", language);
      if (translated !== textNode.nodeValue) {
        textNode.nodeValue = translated;
      }
    }
    node = walker.nextNode();
  }

  if (root instanceof Element) {
    translateElementAttributes(root, language);
  }
  root.querySelectorAll?.("[aria-label], [placeholder], [title], img[alt]").forEach((element) => {
    translateElementAttributes(element, language);
  });
}

function translateElementAttributes(element: Element, language: AppLanguage): void {
  ["aria-label", "placeholder", "title", "alt"].forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (!value) {
      return;
    }
    const translated = translateUiText(value, language);
    if (translated !== value) {
      element.setAttribute(attribute, translated);
    }
  });
}

export function currentAppLanguage(): AppLanguage {
  const languageMode = readStoredLanguageMode();
  return languageMode === "auto" ? readSystemLanguage() : languageMode;
}

export function translate(language: AppLanguage, key: TranslationKey, values?: TranslationValues): string {
  const template = translations[language][key] ?? translations.no[key] ?? key;
  return formatTranslation(template, values);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languageMode, setLanguageMode] = useState<LanguageMode>(readStoredLanguageMode);
  const [systemLanguage, setSystemLanguage] = useState<AppLanguage>(readSystemLanguage);
  const language = languageMode === "auto" ? systemLanguage : languageMode;

  useEffect(() => {
    const handleLanguageChange = () => {
      setSystemLanguage(readSystemLanguage());
    };
    window.addEventListener("languagechange", handleLanguageChange);
    handleLanguageChange();
    return () => {
      window.removeEventListener("languagechange", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "no" ? "nb" : "en";
    document.documentElement.dataset.languageMode = languageMode;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languageMode);
    } catch {
      // Ignore storage errors in embedded browser contexts.
    }
  }, [language, languageMode]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const translateDocument = () => {
      translateElementText(document.body, language);
    };
    const frame = window.requestAnimationFrame(translateDocument);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target instanceof Text) {
          if (!shouldSkipTextNode(mutation.target)) {
            const translated = translateUiText(mutation.target.nodeValue ?? "", language);
            if (translated !== mutation.target.nodeValue) {
              mutation.target.nodeValue = translated;
            }
          }
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Text) {
            if (!shouldSkipTextNode(node)) {
              const translated = translateUiText(node.nodeValue ?? "", language);
              if (translated !== node.nodeValue) {
                node.nodeValue = translated;
              }
            }
            return;
          }
          if (node instanceof Element) {
            translateElementText(node, language);
          }
        });
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateElementAttributes(mutation.target, language);
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-label", "placeholder", "title", "alt"],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    languageMode,
    setLanguageMode,
    systemLanguage,
    t: (key, values) => translate(language, key, values),
  }), [language, languageMode, systemLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
