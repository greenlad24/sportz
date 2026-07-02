// שמות קבוצות/נבחרות בעברית לרצועת התוצאות (וכל מקום שצריך שם קצר בעברית).
// ממופה לפי השם המלא באנגלית מ-ESPN (חד-משמעי; קיצורים מתנגשים בין ליגות -
// למשל POR = פורטוגל בכדורגל אך פורטלנד ב-NBA). שמות קצרים בכוונה (הרצועה צרה).
// לא ידוע -> מוחזר הקיצור/השם המקורי (עדיף אנגלית על ריק).

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TEAMS: Record<string, string> = {};
function add(he: string, ...names: string[]) {
  for (const n of names) TEAMS[norm(n)] = he;
}

// ── נבחרות מונדיאל (קודי FIFA/שמות מלאים) ─────────────────────────
add("ישראל", "Israel");
add("ספרד", "Spain");
add("אנגליה", "England");
add("צרפת", "France");
add("גרמניה", "Germany");
add("פורטוגל", "Portugal");
add("ברזיל", "Brazil");
add("ארגנטינה", "Argentina");
add("איטליה", "Italy");
add("הולנד", "Netherlands");
add("בלגיה", "Belgium");
add("קרואטיה", "Croatia");
add("אוסטריה", "Austria");
add("שווייץ", "Switzerland");
add("אלג'יריה", "Algeria");
add('ארה"ב', "United States", "USA");
add("מקסיקו", "Mexico");
add("קנדה", "Canada");
add("אורוגוואי", "Uruguay");
add("קולומביה", "Colombia");
add("אקוודור", "Ecuador");
add("פרו", "Peru");
add("צ'ילה", "Chile");
add("פרגוואי", "Paraguay");
add("ונצואלה", "Venezuela");
add("יפן", "Japan");
add("דרום קוריאה", "South Korea", "Korea Republic");
add("אוסטרליה", "Australia");
add("איראן", "Iran", "IR Iran");
add("ערב הסעודית", "Saudi Arabia");
add("קטאר", "Qatar");
add("עיראק", "Iraq");
add("ירדן", "Jordan");
add("איחוד האמירויות", "United Arab Emirates");
add("מרוקו", "Morocco");
add("סנגל", "Senegal");
add("גאנה", "Ghana");
add("ניגריה", "Nigeria");
add("מצרים", "Egypt");
add("תוניסיה", "Tunisia");
add("קמרון", "Cameroon");
add("חוף השנהב", "Ivory Coast", "Côte d'Ivoire", "Cote d Ivoire");
add("דרום אפריקה", "South Africa");
add("פולין", "Poland");
add("דנמרק", "Denmark");
add("שוודיה", "Sweden");
add("נורווגיה", "Norway");
add("סרביה", "Serbia");
add("קרואטיה", "Croatia");
add("ויילס", "Wales");
add("סקוטלנד", "Scotland");
add("אירלנד", "Ireland", "Republic of Ireland");
add("אוקראינה", "Ukraine");
add("טורקיה", "Turkey", "Türkiye");
add("יוון", "Greece");
add("צ'כיה", "Czechia", "Czech Republic");
add("קוסטה ריקה", "Costa Rica");
add("פנמה", "Panama");
add("ג'מייקה", "Jamaica");
add("ניו זילנד", "New Zealand");

// ── פרמייר ליג / מועדוני אירופה (ליגת האלופות) ────────────────────
add("ארסנל", "Arsenal");
add("צ'לסי", "Chelsea");
add("ליברפול", "Liverpool");
add("מנצ'סטר סיטי", "Manchester City");
add("מנצ'סטר יונייטד", "Manchester United");
add("טוטנהאם", "Tottenham Hotspur", "Tottenham");
add("ניוקאסל", "Newcastle United", "Newcastle");
add("אסטון וילה", "Aston Villa");
add("ברייטון", "Brighton & Hove Albion", "Brighton");
add("ווסטהאם", "West Ham United", "West Ham");
add("אוורטון", "Everton");
add("וולבס", "Wolverhampton Wanderers", "Wolves");
add("פולהאם", "Fulham");
add("ברנטפורד", "Brentford");
add("קריסטל פאלאס", "Crystal Palace");
add("נוטינגהאם פורסט", "Nottingham Forest");
add("בורנמות'", "AFC Bournemouth", "Bournemouth");
add("לידס", "Leeds United", "Leeds");
add("ברנלי", "Burnley");
add("סנדרלנד", "Sunderland");
add("קובנטרי", "Coventry City", "Coventry");
add("ריאל מדריד", "Real Madrid");
add("ברצלונה", "Barcelona");
add("אתלטיקו מדריד", "Atletico Madrid", "Atlético Madrid");
add("באיירן מינכן", "Bayern Munich");
add("דורטמונד", "Borussia Dortmund");
add("פ.ס.ז'", "Paris Saint-Germain", "Paris SG");
add("יובנטוס", "Juventus");
add("אינטר", "Inter Milan", "Internazionale");
add("מילאן", "AC Milan");
add("נאפולי", "Napoli");
add("איאקס", "Ajax");
add("פורטו", "Porto", "FC Porto");
add("בנפיקה", "Benfica");

// ── NBA ───────────────────────────────────────────────────────────
add("פורטלנד", "Portland Trail Blazers");
add("בוסטון", "Boston Celtics");
add("לייקרס", "Los Angeles Lakers");
add("קליפרס", "LA Clippers", "Los Angeles Clippers");
add("גולדן סטייט", "Golden State Warriors");
add("ניו יורק", "New York Knicks");
add("ברוקלין", "Brooklyn Nets");
add("פילדלפיה", "Philadelphia 76ers");
add("מיאמי", "Miami Heat");
add("מילווקי", "Milwaukee Bucks");
add("שיקגו", "Chicago Bulls");
add("קליבלנד", "Cleveland Cavaliers");
add("דטרויט", "Detroit Pistons");
add("אינדיאנה", "Indiana Pacers");
add("אטלנטה", "Atlanta Hawks");
add("שרלוט", "Charlotte Hornets");
add("וושינגטון", "Washington Wizards");
add("אורלנדו", "Orlando Magic");
add("טורונטו", "Toronto Raptors");
add("דנוור", "Denver Nuggets");
add("מינסוטה", "Minnesota Timberwolves");
add("אוקלהומה סיטי", "Oklahoma City Thunder");
add("יוטה", "Utah Jazz");
add("דאלאס", "Dallas Mavericks");
add("יוסטון", "Houston Rockets");
add("ממפיס", "Memphis Grizzlies");
add("ניו אורלינס", "New Orleans Pelicans");
add("סן אנטוניו", "San Antonio Spurs");
add("פיניקס", "Phoenix Suns");
add("סקרמנטו", "Sacramento Kings");

// ── יורוליג / כדורסל ישראלי ───────────────────────────────────────
add('מכבי ת"א', "Maccabi Tel Aviv", "Maccabi Playtika Tel Aviv");
add('הפועל ת"א', "Hapoel Tel Aviv", "Hapoel Shlomo Tel Aviv");
add("הפועל ירושלים", "Hapoel Jerusalem");
add("מכבי חיפה", "Maccabi Haifa");
add("אולימפיאקוס", "Olympiacos");
add("פנאתינייקוס", "Panathinaikos");
add("פנרבחצ'ה", "Fenerbahce", "Fenerbahçe");
add("אנדולו אפס", "Anadolu Efes");
add("ריאל מדריד", "Real Madrid");
add("צ'רוונה זבזדה", "Crvena Zvezda", "Red Star");
add("פרטיזן", "Partizan");
add("מונאקו", "Monaco", "AS Monaco");
add("באיירן מינכן (כדורסל)", "Bayern Munich Basketball");
add("מילאנו", "Olimpia Milano", "EA7 Emporio Armani Milan");
add("בולוניה", "Virtus Bologna");
add("ז'לגיריס", "Zalgiris", "Žalgiris");
add("ברצלונה", "FC Barcelona");
add("באסקוניה", "Baskonia");
add("ולנסיה", "Valencia");
add("פאריס (כדורסל)", "Paris Basketball");

/** שם קבוצה/נבחרת בעברית לפי השם המלא באנגלית; נפילה חיננית לקיצור/מקורי. */
export function teamHe(fullName?: string, abbr?: string): string {
  const hit = TEAMS[norm(fullName || "")];
  if (hit) return hit;
  return (abbr && abbr.trim()) || (fullName && fullName.trim()) || "";
}

// ── תרגום סטטוס משחק נפוץ מ-ESPN לעברית ────────────────────────────
const STATUS: Record<string, string> = {
  halftime: "מחצית",
  ht: "מחצית",
  "1st half": "מחצית 1",
  "2nd half": "מחצית 2",
  final: "סיום",
  ft: "סיום",
  "full time": "סיום",
  "end of 1st quarter": "סוף רבע 1",
  "end of 2nd quarter": "סוף רבע 2",
  "end of 3rd quarter": "סוף רבע 3",
  postponed: "נדחה",
  delayed: "עוכב",
};

/**
 * סטטוס בעברית: ממיר ביטויים אנגליים נפוצים; שעון-משחק מספרי (כמו "34'" /
 * "5:23 - 3rd") נשאר כפי שהוא (ניטרלי-שפה). "3rd"/"4th" מתורגמים לרבע.
 */
export function statusHe(raw?: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  const mapped = STATUS[s.toLowerCase()];
  if (mapped) return mapped;
  return s
    .replace(/\b1st Qtr\b/i, "רבע 1")
    .replace(/\b2nd Qtr\b/i, "רבע 2")
    .replace(/\b3rd Qtr\b/i, "רבע 3")
    .replace(/\b4th Qtr\b/i, "רבע 4")
    .replace(/\bOT\b/i, "הארכה")
    .replace(/\b(1st|2nd|3rd|4th)\b/i, (m) => "רבע " + m[0]);
}
