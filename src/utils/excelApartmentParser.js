const xlsx = require("xlsx");
const { buildApartmentTitle } = require("./apartmentTitle");
const { parseNumber } = require("./number");

function readCell(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
}

function parseApartmentsFromExcelBuffer(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  return rows
    .map((row) => {
      const neighborhood = readCell(row, ["neighborhood", "שכונה"]);
      const roomsRaw = readCell(row, ["rooms", "חדרים"]);
      const priceRaw = readCell(row, ["price", "מחיר"]);
      const address = String(readCell(row, ["address", "כתובת"]) || "").trim();
      const titleRaw = readCell(row, ["title", "כותרת", "שם דירה"]);

      const rooms = parseNumber(roomsRaw);
      const price = parseNumber(priceRaw);

      if (!neighborhood || !rooms || !price) {
        return null;
      }

      return {
        neighborhood: String(neighborhood).trim(),
        rooms,
        price,
        address,
        description: String(readCell(row, ["description", "תיאור"]) || "").trim(),
        contact_name: String(readCell(row, ["contact_name", "איש קשר"]) || "").trim(),
        contact_phone: String(readCell(row, ["contact_phone", "טלפון"]) || "").trim(),
        contact_email: String(readCell(row, ["contact_email", "אימייל"]) || "")
          .trim()
          .toLowerCase(),
        title:
          titleRaw && String(titleRaw).trim()
            ? String(titleRaw).trim()
            : buildApartmentTitle({
                rooms,
                neighborhood: String(neighborhood).trim(),
                address,
              }),
        source: "admin",
      };
    })
    .filter(Boolean);
}

module.exports = {
  parseApartmentsFromExcelBuffer,
};
